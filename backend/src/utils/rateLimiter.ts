import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from './logger';

interface RequestRecord {
  count: number;
  resetTime: number;
}

interface LoginAttemptRecord {
  attempts: number;
  lockedUntil: number | null;
}

class RateLimiterManager {
  private ipRequests = new Map<string, RequestRecord>();
  private loginAttempts = new Map<string, LoginAttemptRecord>();

  constructor() {
    // Periodic garbage collection every 10 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, val] of this.ipRequests.entries()) {
        if (now > val.resetTime) this.ipRequests.delete(key);
      }
      for (const [key, val] of this.loginAttempts.entries()) {
        if (val.lockedUntil && now > val.lockedUntil) this.loginAttempts.delete(key);
      }
    }, 10 * 60 * 1000);
  }

  getGeneralLimiter() {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
      const now = Date.now();
      const windowMs = config.security.rateLimitWindow * 60 * 1000;
      const maxRequests = config.security.rateLimitMax;

      const record = this.ipRequests.get(ip) || { count: 0, resetTime: now + windowMs };

      if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + windowMs;
      }

      record.count += 1;
      this.ipRequests.set(ip, record);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

      if (record.count > maxRequests) {
        logger.warn(`Rate limit exceeded for IP: ${ip}`);
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Too many requests, please try again after ${Math.ceil((record.resetTime - now) / 1000)} seconds`
        });
      }

      next();
    };
  }

  isLoginLocked(identifier: string): { locked: boolean; remainingSeconds: number } {
    const record = this.loginAttempts.get(identifier);
    if (!record || !record.lockedUntil) return { locked: false, remainingSeconds: 0 };
    const now = Date.now();
    if (now < record.lockedUntil) {
      return { locked: true, remainingSeconds: Math.ceil((record.lockedUntil - now) / 1000) };
    }
    this.loginAttempts.delete(identifier);
    return { locked: false, remainingSeconds: 0 };
  }

  recordFailedLogin(identifier: string) {
    const record = this.loginAttempts.get(identifier) || { attempts: 0, lockedUntil: null };
    record.attempts += 1;

    if (record.attempts >= config.security.bruteForceMaxAttempts) {
      const lockMs = config.security.bruteForceLockTime * 60 * 1000;
      record.lockedUntil = Date.now() + lockMs;
      logger.warn(`Brute force lockout triggered for ${identifier}. Locked for ${config.security.bruteForceLockTime} min.`);
    }

    this.loginAttempts.set(identifier, record);
  }

  resetLoginAttempts(identifier: string) {
    this.loginAttempts.delete(identifier);
  }
}

export const rateLimiter = new RateLimiterManager();
