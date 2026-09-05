import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'manager' | 'employee' | 'client';
  clientId?: string;
  jti?: string;
}

export class JwtUtil {
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiration
    });
  }

  static generateRefreshToken(payload: TokenPayload): { token: string; jti: string; expiresAt: Date } {
    const jti = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const token = jwt.sign({ ...payload, jti }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiration
    });
    const expiresAt = new Date(Date.now() + config.jwt.refreshExpiration * 1000);
    return { token, jti, expiresAt };
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
  }
}
