import { getDb } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../config/env.js';
import { User, UserPublic, UserRole } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

function mapRowToUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    failedLoginAttempts: row.failed_login_attempts,
    lockedUntil: row.locked_until,
  };
}

function mapRowToUserPublic(row: any): UserPublic {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: Boolean(row.active),
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

export async function createUser(
  name: string,
  email: string,
  password: string,
  role: UserRole = 'employee'
): Promise<UserPublic> {
  const db = await getDb();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO users (id, name, email, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, email.toLowerCase(), passwordHash, role, 1, now, now]
  );

  const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  return mapRowToUserPublic(user);
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDb();
  const row = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  return row ? mapRowToUser(row) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  const row = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  return row ? mapRowToUser(row) : null;
}

export async function getUserPublicById(id: string): Promise<UserPublic | null> {
  const db = await getDb();
  const row = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  return row ? mapRowToUserPublic(row) : null;
}

export async function getAllUsers(
  page = 1,
  limit = 20,
  search = '',
  role?: UserRole,
  active?: boolean
): Promise<{ users: UserPublic[]; total: number }> {
  const db = await getDb();
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (search) {
    whereClause += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (role) {
    whereClause += ' AND role = ?';
    params.push(role);
  }

  if (active !== undefined) {
    whereClause += ' AND active = ?';
    params.push(active ? 1 : 0);
  }

  const countResult = await db.get(
    `SELECT COUNT(*) as total FROM users ${whereClause}`,
    params
  );

  const rows = await db.all(
    `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    users: rows.map(mapRowToUserPublic),
    total: countResult.total,
  };
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, 'name' | 'email' | 'role' | 'active'>>
): Promise<UserPublic | null> {
  const db = await getDb();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.email !== undefined) {
    updates.push('email = ?');
    params.push(data.email.toLowerCase());
  }
  if (data.role !== undefined) {
    updates.push('role = ?');
    params.push(data.role);
  }
  if (data.active !== undefined) {
    updates.push('active = ?');
    params.push(data.active ? 1 : 0);
  }

  if (updates.length === 0) return getUserPublicById(id);

  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);

  await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  return getUserPublicById(id);
}

export async function updateUserPassword(id: string, newPassword: string): Promise<void> {
  const db = await getDb();
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  await db.run(
    `UPDATE users SET password_hash = ?, updated_at = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?`,
    [passwordHash, now, id]
  );
}

export async function deleteUser(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.run('DELETE FROM users WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

/**
 * Records a failed login for THIS account only.
 *
 * Returns the resulting lock status so the HTTP layer can answer with a
 * server-issued `retryAfter` (the client never computes it itself).
 * The counter/lock is stored on the user row, so it is per-account and
 * other users are never affected. A stale lock (already expired) starts
 * a fresh counter instead of escalating — the lock duration is always
 * exactly LOGIN_LOCK_DURATION_SECONDS, never cumulative.
 */
export async function recordFailedLogin(userId: string): Promise<LoginLockStatus> {
  const db = await getDb();
  const user = await getUserById(userId);
  if (!user) {
    return { locked: false, remainingSeconds: 0, lockedUntil: null, failedLoginAttempts: 0 };
  }

  const now = new Date();
  const previousLockExpired =
    !!user.lockedUntil && new Date(user.lockedUntil).getTime() <= now.getTime();

  // If the previous lock already expired, start from a clean slate
  // instead of carrying the old (stale) counter forward.
  const attempts = previousLockExpired ? 1 : user.failedLoginAttempts + 1;

  let lockedUntil: string | null = null;
  if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    lockedUntil = new Date(now.getTime() + LOGIN_LOCK_DURATION_SECONDS * 1000).toISOString();
  }

  await db.run(
    `UPDATE users SET failed_login_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?`,
    [attempts, lockedUntil, now.toISOString(), userId]
  );

  return {
    locked: !!lockedUntil,
    remainingSeconds: lockedUntil ? LOGIN_LOCK_DURATION_SECONDS : 0,
    lockedUntil,
    failedLoginAttempts: attempts,
  };
}

export async function recordSuccessfulLogin(userId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.run(
    `UPDATE users SET last_login_at = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?`,
    [now, now, userId]
  );
}

/**
 * Brute-force protection constants.
 *
 * These are intentionally hard-coded for production (NOT env-configured):
 * the audit found that a `BRUTE_FORCE_LOCK_TIME` env var was interpreted
 * in minutes in some code paths and seconds in others, producing locks of
 * ~772–773 seconds instead of 60. A single constant removes the whole
 * class of unit-mismatch bugs.
 */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_DURATION_SECONDS = 60;

export interface LoginLockStatus {
  locked: boolean;
  /** Whole seconds until the lock expires. 0 when not locked. */
  remainingSeconds: number;
  /** ISO timestamp at which the lock expires. null when not locked. */
  lockedUntil: string | null;
  failedLoginAttempts: number;
}

/**
 * Authoritative per-ACCOUNT lock status.
 *
 * The lock lives on the user row (`locked_until`), so it is scoped to a
 * single account by construction — one user can never block another.
 * When the lock has already expired the stale counter is reset here so
 * old `locked_until` values can never keep a user locked out.
 */
export async function getUserLockStatus(user: User): Promise<LoginLockStatus> {
  if (!user.lockedUntil) {
    return {
      locked: false,
      remainingSeconds: 0,
      lockedUntil: null,
      failedLoginAttempts: user.failedLoginAttempts,
    };
  }

  const lockedUntilMs = new Date(user.lockedUntil).getTime();
  const now = Date.now();

  // Corrupt / unparseable timestamp is treated as "not locked" and cleaned up.
  if (Number.isNaN(lockedUntilMs) || now >= lockedUntilMs) {
    const db = await getDb();
    await db.run(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), user.id]
    );
    return { locked: false, remainingSeconds: 0, lockedUntil: null, failedLoginAttempts: 0 };
  }

  return {
    locked: true,
    remainingSeconds: Math.max(1, Math.ceil((lockedUntilMs - now) / 1000)),
    lockedUntil: new Date(lockedUntilMs).toISOString(),
    failedLoginAttempts: user.failedLoginAttempts,
  };
}

export async function isUserLocked(user: User): Promise<boolean> {
  return (await getUserLockStatus(user)).locked;
}

export async function changeUserRole(userId: string, newRole: UserRole): Promise<UserPublic | null> {
  return updateUser(userId, { role: newRole });
}

export async function toggleUserActive(userId: string): Promise<UserPublic | null> {
  const user = await getUserById(userId);
  if (!user) return null;
  return updateUser(userId, { active: !user.active });
}