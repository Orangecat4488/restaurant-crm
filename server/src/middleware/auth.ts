import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyRefreshToken } from '../utils/jwt.js';
import { getUserById } from '../models/user.js';
import { ApiResponse, JwtPayload } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    const response: ApiResponse = {
      success: false,
      error: 'Access token required',
    };
    res.status(401).json(response);
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or expired access token',
    };
    res.status(401).json(response);
    return;
  }

  // Verify user still exists and is active
  const user = await getUserById(payload.userId);
  if (!user || !user.active) {
    const response: ApiResponse = {
      success: false,
      error: 'User not found or deactivated',
    };
    res.status(401).json(response);
    return;
  }

  req.user = payload;
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      res.status(401).json(response);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        error: 'Insufficient permissions',
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
}

export function requirePermission(resource: string, action: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      res.status(401).json(response);
      return;
    }

    // Import PERMISSIONS dynamically to avoid circular dependency
    import('../types/index.js').then(({ PERMISSIONS }) => {
      const resourcePerms = PERMISSIONS[resource as keyof typeof PERMISSIONS];
      if (!resourcePerms) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid resource',
        };
        res.status(400).json(response);
        return;
      }

      const allowedRoles = resourcePerms[action as keyof typeof resourcePerms] as readonly string[] | undefined;
      if (!allowedRoles || !allowedRoles.includes(req.user!.role)) {
        const response: ApiResponse = {
          success: false,
          error: 'Insufficient permissions',
        };
        res.status(403).json(response);
        return;
      }

      next();
    }).catch(() => {
      const response: ApiResponse = {
        success: false,
        error: 'Permission check failed',
      };
      res.status(500).json(response);
    });
  };
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}