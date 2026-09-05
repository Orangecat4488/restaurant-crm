import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRY, JWT_REFRESH_EXPIRY } from '../config/env.js';
import { JwtPayload, AuthTokens } from '../types/index.js';

export function generateAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp' | 'jti'>): string {
  return jwt.sign(
    { ...payload, type: 'access', jti: uuidv4() },
    JWT_ACCESS_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRY as any }
  );
}

export function generateRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp' | 'jti'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh', jti: uuidv4() },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY as any }
  );
}

export function generateTokens(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): AuthTokens {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenExpiry(token: string): Date | null {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return null;
  return new Date(decoded.exp * 1000);
}

export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return expiry < new Date();
}