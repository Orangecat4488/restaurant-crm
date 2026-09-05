import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS, AUTH_RATE_LIMIT_MAX, isProduction, FRONTEND_URL } from '../config/env.js';
import { ApiResponse } from '../types/index.js';

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
});

/**
 * Rate-limit key for auth endpoints.
 *
 * CRITICAL: the key is the ACCOUNT (email), not the IP. The previous
 * IP-only key caused the audited bug where 5 failed attempts by User A
 * locked out User B and User C on the same IP for the remainder of the
 * 15-minute window (~772–773 seconds). With per-account keying, one
 * user's failures can never consume another user's budget.
 *
 * The IP fallback only applies to requests that carry no email
 * (e.g. /refresh) and exists purely as DoS protection.
 */
interface LoginRequestBody {
  email?: unknown;
}

export function authRateLimitKey(req: Request): string {
  const email = (req.body as LoginRequestBody | undefined)?.email;
  if (typeof email === 'string' && email.trim()) {
    return email.trim().toLowerCase();
  }
  return req.ip || 'unknown';
}

// Strict rate limiter for auth endpoints (per-ACCOUNT keying, see above)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: AUTH_RATE_LIMIT_MAX * 4, // per-account budget; the real brute-force
                                // lock (5 wrong → 60s) is enforced by the
                                // account-level lock in the user model
  message: {
    success: false,
    error: 'Too many login attempts for this account, please try again later',
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authRateLimitKey,
  skipSuccessfulRequests: true,
});

// Helmet configuration for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", FRONTEND_URL],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
});

// CSRF protection - disable for API endpoints that use JWT in Authorization header
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

// Skip CSRF for safe HTTP methods, Bearer token requests, and public auth endpoints
export function conditionalCsrf(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return next();
  }
  if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/refresh') || req.path.startsWith('/api/health')) {
    return next();
  }
  // Apply CSRF for other cookie-based state-changing requests
  (csrfProtection as any)(req, res, next);
}

// XSS protection - sanitize input (skip passwords and tokens to avoid corrupting credentials)
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  const sensitiveKeys = new Set([
    'password',
    'currentPassword',
    'newPassword',
    'refreshToken',
    'accessToken',
    'token',
    'imageUrl',
    'image_url',
  ]);

  const sanitize = (obj: any, keyName?: string): any => {
    if (keyName && sensitiveKeys.has(keyName)) {
      return obj;
    }
    if (typeof obj === 'string') {
      return obj
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => sanitize(item));
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value, key);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitize(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitize(req.params);
  }

  next();
}

// Security headers middleware (additional to helmet)
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // Remove server header
  res.removeHeader('X-Powered-By');
  next();
}

// Request validation middleware
export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const isCompositeSchema = schema.shape && (schema.shape.body || schema.shape.query || schema.shape.params);
    const dataToValidate = isCompositeSchema
      ? { body: req.body, query: req.query, params: req.params }
      : req.body;

    const result = schema.safeParse(dataToValidate);
    if (!result.success) {
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed',
        message: result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
      res.status(400).json(response);
      return;
    }
    if (isCompositeSchema && result.data) {
      if (result.data.body !== undefined) req.body = result.data.body;
      if (result.data.query !== undefined) (req as any).query = result.data.query;
      if (result.data.params !== undefined) (req as any).params = result.data.params;
    } else {
      req.body = result.data;
    }
    next();
  };
}

// IP blocking for suspicious activity
const suspiciousIps = new Map<string, { count: number; firstAttempt: number }>();

export function suspiciousActivityDetector(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  const record = suspiciousIps.get(ip);
  if (!record || now - record.firstAttempt > windowMs) {
    suspiciousIps.set(ip, { count: 1, firstAttempt: now });
    next();
    return;
  }

  record.count++;
  if (record.count > 30) {
    const response: ApiResponse = {
      success: false,
      error: 'Suspicious activity detected. Access temporarily blocked.',
    };
    res.status(429).json(response);
    return;
  }

  next();
}

// Clean up old IP records periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const [ip, record] of suspiciousIps.entries()) {
    if (now - record.firstAttempt > windowMs) {
      suspiciousIps.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes