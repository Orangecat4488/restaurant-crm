import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService, LockedError, InvalidCredentialsError } from './auth.service';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  deviceFingerprint: z.string().min(3).optional()
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await authService.register(validated);

      // Set httpOnly cookie for refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        message: 'Registration successful',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, deviceFingerprint } = loginSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      try {
        const result = await authService.login(email, password, ip, userAgent, deviceFingerprint);

        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
          message: 'Login successful',
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        });
      } catch (err: any) {
        if (err instanceof LockedError) {
          // 429 with structured retry info. Frontend must use this value
          // verbatim and never compute its own countdown.
          res.setHeader('Retry-After', String(err.retryAfter));
          return res.status(429).json({
            error: 'AccountLocked',
            message: `Account temporarily locked. Try again in ${err.retryAfter} seconds.`,
            retryAfter: err.retryAfter,
            lockedUntil: err.lockedUntil
          });
        }
        if (err instanceof InvalidCredentialsError) {
          return res.status(401).json({
            error: 'InvalidCredentials',
            message: 'Invalid email or password'
          });
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.refreshToken || req.body.refreshToken;
      if (!token) {
        return res.status(400).json({ error: 'BadRequest', message: 'Refresh token is required' });
      }

      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const result = await authService.refreshToken(token, ip);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        message: 'Token refreshed',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.refreshToken || req.body.refreshToken;
      if (token) {
        await authService.logout(token);
      }
      res.clearCookie('refreshToken');
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const user = await authService.getMe(req.user.userId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const updated = await authService.updateProfile(req.user.userId, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'BadRequest', message: 'Both old and new passwords are required' });
      }
      const result = await authService.changePassword(req.user.userId, oldPassword, newPassword);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Development-only endpoint that re-seeds the demo admin and client
   * users with the documented demo credentials. Useful when the user
   * has been locked out, has forgotten the password, or wants to verify
   * the seed worked. Always idempotent.
   *
   * Disabled in production. Enabled in development.
   */
  static async devResetDemoCredentials(_req: Request, res: Response, next: NextFunction) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Forbidden', message: 'Disabled in production' });
      }
      const { runSeed } = await import('../../database/seed');
      await runSeed();
      res.json({
        success: true,
        message: 'Demo credentials have been re-seeded.',
        credentials: {
          admin: { email: 'admin@crm-restaurant.com', password: 'Admin@123456' },
          client: { email: 'client@bistro.com', password: 'Client@123456' }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
