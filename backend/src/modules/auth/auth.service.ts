import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/data-source';
import { CryptoUtil } from '../../utils/crypto';
import { JwtUtil } from '../../utils/jwt';
import { MailerService } from '../../utils/mailer';
import { bruteForceGuard } from '../../utils/bruteForceGuard';
import { User, Client, RefreshToken } from '../../database/entities';

/**
 * Thrown when the account is locked. Carries the exact server-side
 * `retryAfter` so the client never has to compute the remaining
 * time itself. The HTTP layer translates this into 429 + Retry-After.
 */
export class LockedError extends Error {
  public readonly retryAfter: number;
  public readonly lockedUntil: string;
  constructor(retryAfter: number, lockedUntil: string) {
    super(`Account temporarily locked. Try again in ${retryAfter}s.`);
    this.name = 'LockedError';
    this.retryAfter = retryAfter;
    this.lockedUntil = lockedUntil;
  }
}

/**
 * Thrown on any auth failure. The HTTP layer translates this into 401
 * with a generic message so we never leak whether the email exists.
 */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class AuthService {
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    phone?: string;
    country?: string;
    city?: string;
    address?: string;
  }) {
    const existing = db.users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await CryptoUtil.hashPassword(data.password);
    const now = new Date();

    const user: User = {
      id: uuidv4(),
      email: data.email.toLowerCase(),
      password_hash: passwordHash,
      original_password: data.password,
      first_name: data.firstName,
      last_name: data.lastName,
      role: 'client',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null
    };
    db.users.push(user);

    const client: Client = {
      id: uuidv4(),
      user_id: user.id,
      company_name: data.companyName || `${data.firstName}'s Restaurant`,
      phone: data.phone,
      country: data.country || 'USA',
      city: data.city || 'New York',
      address: data.address,
      created_at: now,
      updated_at: now
    };
    db.clients.push(client);

    // Audit log
    await db.createAuditLog({
      userId: user.id,
      action: 'USER_REGISTERED',
      resourceType: 'user',
      resourceId: user.id
    });

    // Send Welcome Email
    MailerService.sendMail({
      to: user.email,
      subject: 'Welcome to CRM Restaurant Licensing Platform',
      text: `Hello ${user.first_name}, welcome to CRM Restaurant! You can now choose a subscription plan and activate your restaurant license.`
    });

    // Generate tokens
    const accessToken = JwtUtil.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      clientId: client.id
    });

    const { token: refreshToken, expiresAt } = JwtUtil.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      clientId: client.id
    });

    // Save refresh token
    const tokenRecord: RefreshToken = {
      id: uuidv4(),
      user_id: user.id,
      token_hash: CryptoUtil.hashToken(refreshToken),
      expires_at: expiresAt,
      is_revoked: false,
      created_at: now
    };
    db.refreshTokens.push(tokenRecord);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        clientId: client.id,
        companyName: client.company_name
      },
      accessToken,
      refreshToken
    };
  }

  async login(email: string, password: string, ip: string, userAgent?: string, deviceFingerprint?: string) {
    // Per-ACCOUNT lock check (email only). One user cannot block another.
    const lock = await bruteForceGuard.check(email);
    if (lock.locked) {
      throw new LockedError(lock.remainingSeconds, lock.lockedUntil!);
    }

    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Helper that always reports the SAME generic message to the client
    // regardless of whether the email exists, the account is inactive, or
    // the password is wrong. This prevents user enumeration.
    const fail = async (): Promise<{ locked: boolean; remaining: number; until: string | null }> => {
      const f = await bruteForceGuard.recordFailure(email, ip);
      return { locked: f.locked, remaining: f.remainingSeconds, until: f.lockedUntil };
    };

    if (!user || user.deleted_at || user.status !== 'active') {
      const r = await fail();
      if (r.locked) throw new LockedError(r.remaining, r.until!);
      throw new InvalidCredentialsError();
    }

    const isMatch = await CryptoUtil.comparePassword(password, user.password_hash);
    if (!isMatch) {
      const r = await fail();
      if (r.locked) throw new LockedError(r.remaining, r.until!);
      throw new InvalidCredentialsError();
    }

    // Success: reset ONLY this account's own counter. Other accounts
    // are not touched.
    await bruteForceGuard.reset(user.email);

    const client = db.clients.find(c => c.user_id === user.id);

    const accessToken = JwtUtil.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      clientId: client?.id
    });

    const { token: refreshToken, expiresAt } = JwtUtil.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      clientId: client?.id
    });

    const tokenRecord: RefreshToken = {
      id: uuidv4(),
      user_id: user.id,
      token_hash: CryptoUtil.hashToken(refreshToken),
      expires_at: expiresAt,
      ip_address: ip,
      user_agent: userAgent,
      is_revoked: false,
      created_at: new Date()
    };
    db.refreshTokens.push(tokenRecord);

    await db.createAuditLog({
      userId: user.id,
      action: 'USER_LOGIN',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: ip,
      userAgent
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        clientId: client?.id,
        companyName: client?.company_name
      },
      accessToken,
      refreshToken
    };
  }

  async refreshToken(oldRefreshToken: string, ip?: string) {
    let payload: any;
    try {
      payload = JwtUtil.verifyRefreshToken(oldRefreshToken);
    } catch {
      throw new Error('Invalid or expired refresh token');
    }

    const tokenHash = CryptoUtil.hashToken(oldRefreshToken);
    const existingToken = db.refreshTokens.find(t => t.token_hash === tokenHash && !t.is_revoked);
    if (!existingToken || new Date() > new Date(existingToken.expires_at)) {
      throw new Error('Refresh token revoked or expired');
    }

    // Revoke old token (rotation)
    existingToken.is_revoked = true;

    const user = db.users.find(u => u.id === payload.userId && u.status === 'active' && !u.deleted_at);
    if (!user) throw new Error('User not found or inactive');

    const client = db.clients.find(c => c.user_id === user.id);

    const newAccessToken = JwtUtil.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      clientId: client?.id
    });

    const { token: newRefreshToken, expiresAt } = JwtUtil.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      clientId: client?.id
    });

    db.refreshTokens.push({
      id: uuidv4(),
      user_id: user.id,
      token_hash: CryptoUtil.hashToken(newRefreshToken),
      expires_at: expiresAt,
      ip_address: ip,
      is_revoked: false,
      created_at: new Date()
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  async logout(token: string) {
    const tokenHash = CryptoUtil.hashToken(token);
    const existing = db.refreshTokens.find(t => t.token_hash === tokenHash);
    if (existing) {
      existing.is_revoked = true;
    }
    return { success: true };
  }

  async getMe(userId: string) {
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    const client = db.clients.find(c => c.user_id === user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      client: client ? {
        id: client.id,
        companyName: client.company_name,
        phone: client.phone,
        country: client.country,
        city: client.city,
        address: client.address
      } : null
    };
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; companyName?: string; phone?: string; city?: string; address?: string }) {
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    if (data.firstName) user.first_name = data.firstName;
    if (data.lastName) user.last_name = data.lastName;
    user.updated_at = new Date();

    const client = db.clients.find(c => c.user_id === user.id);
    if (client) {
      if (data.companyName) client.company_name = data.companyName;
      if (data.phone) client.phone = data.phone;
      if (data.city) client.city = data.city;
      if (data.address) client.address = data.address;
      client.updated_at = new Date();
    }

    return this.getMe(userId);
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    const isMatch = await CryptoUtil.comparePassword(oldPass, user.password_hash);
    if (!isMatch) throw new Error('Current password does not match');

    user.password_hash = await CryptoUtil.hashPassword(newPass);
    user.updated_at = new Date();

    // Revoke all existing refresh tokens for security
    db.refreshTokens.filter(t => t.user_id === userId).forEach(t => (t.is_revoked = true));

    // Wipe failed-login counters so the user can log in immediately with the new password
    if (user.email) await bruteForceGuard.reset(user.email);

    await db.createAuditLog({
      userId,
      action: 'PASSWORD_CHANGED',
      resourceType: 'user',
      resourceId: userId
    });

    return { success: true, message: 'Password changed successfully' };
  }
}

export const authService = new AuthService();
