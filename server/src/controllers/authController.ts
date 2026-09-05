import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { verifyRefreshToken, generateTokens, verifyAccessToken } from '../utils/jwt.js';
import { getUserByEmail, recordFailedLogin, recordSuccessfulLogin, getUserLockStatus, updateUserPassword, getUserById, verifyPassword } from '../models/user.js';
import { saveRefreshToken, isRefreshTokenValid, revokeRefreshToken, revokeAllUserRefreshTokens } from '../models/token.js';
import { ApiResponse, LoginRequest, RefreshTokenRequest } from '../types/index.js';
import { SESSION_COOKIE_NAME, isProduction } from '../config/env.js';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as LoginRequest;

    const user = await getUserByEmail(email);
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid credentials',
      };
      res.status(401).json(response);
      return;
    }

    // Per-ACCOUNT lock check. The lock lives on the user row, so it can
    // only ever affect THIS account — never another user or tenant.
    // The response carries the server-issued `retryAfter`/`lockedUntil`
    // so the frontend never computes the countdown itself.
    const lockStatus = await getUserLockStatus(user);
    if (lockStatus.locked) {
      res.setHeader('Retry-After', String(lockStatus.remainingSeconds));
      const response: ApiResponse & { retryAfter: number; lockedUntil: string | null } = {
        success: false,
        error: 'AccountLocked',
        message: `Account temporarily locked due to too many failed attempts. Try again in ${lockStatus.remainingSeconds} seconds.`,
        retryAfter: lockStatus.remainingSeconds,
        lockedUntil: lockStatus.lockedUntil,
      };
      res.status(423).json(response);
      return;
    }

    // Check if user is active
    if (!user.active) {
      const response: ApiResponse = {
        success: false,
        error: 'Account deactivated. Contact administrator.',
      };
      res.status(403).json(response);
      return;
    }

    // Verify password
    const validPassword = await verifyPassword(user, password);
    if (!validPassword) {
      const failStatus = await recordFailedLogin(user.id);
      if (failStatus.locked) {
        // This failed attempt just triggered the lock — report it
        // immediately with the exact server-issued countdown.
        res.setHeader('Retry-After', String(failStatus.remainingSeconds));
        const response: ApiResponse & { retryAfter: number; lockedUntil: string | null } = {
          success: false,
          error: 'AccountLocked',
          message: `Account temporarily locked due to too many failed attempts. Try again in ${failStatus.remainingSeconds} seconds.`,
          retryAfter: failStatus.remainingSeconds,
          lockedUntil: failStatus.lockedUntil,
        };
        res.status(423).json(response);
        return;
      }
      const response: ApiResponse = {
        success: false,
        error: 'Invalid credentials',
      };
      res.status(401).json(response);
      return;
    }

    // Record successful login
    await recordSuccessfulLogin(user.id);

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Save refresh token to database (7 days validity)
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await saveRefreshToken(user.id, tokens.refreshToken, refreshExpiresAt);

    // Set refresh token as httpOnly cookie
    res.cookie(SESSION_COOKIE_NAME, tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    const response: ApiResponse<{ user: { id: string; name: string; email: string; role: string }; accessToken: string }> = {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken: tokens.accessToken,
      },
      message: 'Login successful',
    };
    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    // Get refresh token from cookie or body
    const token = req.cookies?.[SESSION_COOKIE_NAME] || (req.body as RefreshTokenRequest)?.refreshToken;

    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'Refresh token required',
      };
      res.status(401).json(response);
      return;
    }

    const payload = verifyRefreshToken(token);
    if (!payload || payload.type !== 'refresh') {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid or expired refresh token',
      };
      res.status(401).json(response);
      return;
    }

    // Verify refresh token is valid and not revoked in database
    const isValidInDb = await isRefreshTokenValid(token);
    if (!isValidInDb) {
      const response: ApiResponse = {
        success: false,
        error: 'Refresh token has been revoked or expired',
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

    // Revoke old refresh token (token rotation)
    await revokeRefreshToken(token);

    // Generate new tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Save new refresh token to DB
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await saveRefreshToken(user.id, tokens.refreshToken, refreshExpiresAt);

    // Set new refresh token cookie
    res.cookie(SESSION_COOKIE_NAME, tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    const response: ApiResponse<{ accessToken: string }> = {
      success: true,
      data: {
        accessToken: tokens.accessToken,
      },
      message: 'Token refreshed successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Refresh token error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.[SESSION_COOKIE_NAME] || (req.body as RefreshTokenRequest)?.refreshToken;
    if (token) {
      await revokeRefreshToken(token);
    }

    // Clear refresh token cookie
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    });

    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Logout error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const user = await getUserById(req.user.userId);
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<{ id: string; name: string; email: string; role: string; active: boolean; lastLoginAt?: string }> = {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        lastLoginAt: user.lastLoginAt,
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Get me error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Not authenticated',
      };
      res.status(401).json(response);
      return;
    }

    const { currentPassword, newPassword } = req.body;
    const user = await getUserById(req.user.userId);
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      res.status(404).json(response);
      return;
    }

    const validPassword = await verifyPassword(user, currentPassword);
    if (!validPassword) {
      const response: ApiResponse = {
        success: false,
        error: 'Current password is incorrect',
      };
      res.status(400).json(response);
      return;
    }

    await updateUserPassword(user.id, newPassword);
    await revokeAllUserRefreshTokens(user.id);

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Change password error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function verifyToken(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'Token required',
      };
      res.status(401).json(response);
      return;
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid or expired token',
      };
      res.status(401).json(response);
      return;
    }

    const user = await getUserById(payload.userId);
    if (!user || !user.active) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found or deactivated',
      };
      res.status(401).json(response);
      return;
    }

    const response: ApiResponse<{ valid: boolean; user: { id: string; name: string; email: string; role: string } }> = {
      success: true,
      data: {
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Verify token error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}