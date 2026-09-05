import { Request, Response, NextFunction } from 'express';
import { JwtUtil, TokenPayload } from '../utils/jwt';
import { db } from '../database/data-source';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticateJwt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization token provided'
      });
    }

    const payload = JwtUtil.verifyAccessToken(token);

    // Verify user is active in database
    const user = db.users.find(u => u.id === payload.userId);
    if (!user || user.status !== 'active' || user.deleted_at) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Account is inactive, suspended or no longer exists'
      });
    }

    req.user = payload;
    next();
  } catch (err: any) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token signature'
    });
  }
};
