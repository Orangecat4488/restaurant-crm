import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../database/entities';

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
};

export const requireAdmin = requireRoles('admin');
export const requireAdminOrManager = requireRoles('admin', 'manager');
export const requireClientOrAdmin = requireRoles('client', 'admin');
