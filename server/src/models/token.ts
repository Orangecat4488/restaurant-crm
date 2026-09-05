import { getDb } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export async function saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  const db = await getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  const expiryIso = expiresAt.toISOString();

  await db.run(
    `INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at, revoked)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [id, userId, token, expiryIso, now]
  );
}

export async function isRefreshTokenValid(token: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.get(
    `SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0`,
    [token]
  );

  if (!row) return false;
  if (new Date(row.expires_at) < new Date()) {
    return false;
  }
  return true;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const db = await getDb();
  await db.run(
    `UPDATE refresh_tokens SET revoked = 1 WHERE token = ?`,
    [token]
  );
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  const db = await getDb();
  await db.run(
    `UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?`,
    [userId]
  );
}
