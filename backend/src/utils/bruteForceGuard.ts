import { db } from '../database/data-source';

/**
 * Single source of truth for the login lockout window.
 * Per-account (email) only — one user cannot block another.
 *
 * We intentionally hard-code this to 60 seconds and ignore the legacy
 * `BRUTE_FORCE_LOCK_TIME` env var (which was being interpreted in
 * minutes in some places and seconds in others, producing values like
 * 772/773s depending on which code path executed). Changing this value
 * here changes it everywhere in the system.
 */
export const LOCK_DURATION_SECONDS = 60;
const LOCK_DURATION_MS = LOCK_DURATION_SECONDS * 1000;

export interface BruteForceCheckResult {
  locked: boolean;
  /** Seconds until the lock expires. 0 when not locked. */
  remainingSeconds: number;
  /** ISO timestamp at which the lock expires. null when not locked. */
  lockedUntil: string | null;
  failedAttempts: number;
}

export class BruteForceGuard {
  /**
   * Per-ACCOUNT brute force protection.
   * The lockout is scoped to a single email so other users / accounts
   * are never affected by someone else's failed attempts.
   */
  async check(email: string): Promise<BruteForceCheckResult> {
    if (!email) {
      return { locked: false, remainingSeconds: 0, lockedUntil: null, failedAttempts: 0 };
    }
    const record = await db.getLoginAttemptByEmail(email);
    if (!record || !record.blocked_until) {
      return {
        locked: false,
        remainingSeconds: 0,
        lockedUntil: null,
        failedAttempts: record?.failed_attempts || 0
      };
    }
    const now = Date.now();
    const blockedUntilMs = new Date(record.blocked_until).getTime();
    if (now >= blockedUntilMs) {
      // Window expired — auto reset
      await db.resetLoginAttempt(email);
      return { locked: false, remainingSeconds: 0, lockedUntil: null, failedAttempts: 0 };
    }
    const remainingSeconds = Math.max(1, Math.ceil((blockedUntilMs - now) / 1000));
    return {
      locked: true,
      remainingSeconds,
      lockedUntil: new Date(blockedUntilMs).toISOString(),
      failedAttempts: record.failed_attempts
    };
  }

  async recordFailure(email: string, ip?: string): Promise<BruteForceCheckResult> {
    if (!email) {
      return { locked: false, remainingSeconds: 0, lockedUntil: null, failedAttempts: 0 };
    }

    const existing = await db.getLoginAttemptByEmail(email);
    const previousAttempts = existing?.failed_attempts || 0;
    const newAttempts = previousAttempts + 1;

    // The threshold is hard-coded to 5 for production. We deliberately
    // do not consult config.security here because the env-var path
    // previously produced inconsistent lock durations (see comment
    // on LOCK_DURATION_SECONDS above).
    const MAX_ATTEMPTS = 5;

    let blockedUntil: Date | null = null;
    if (newAttempts >= MAX_ATTEMPTS) {
      blockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }

    await db.upsertLoginAttemptByEmail({
      email: email.toLowerCase(),
      ip_address: ip,
      failed_attempts: newAttempts,
      blocked_until: blockedUntil,
      last_failed_at: new Date()
    });

    if (blockedUntil) {
      return {
        locked: true,
        remainingSeconds: LOCK_DURATION_SECONDS,
        lockedUntil: blockedUntil.toISOString(),
        failedAttempts: newAttempts
      };
    }
    return {
      locked: false,
      remainingSeconds: 0,
      lockedUntil: null,
      failedAttempts: newAttempts
    };
  }

  /** Clears the lockout for a single account only. */
  async reset(email: string) {
    if (!email) return;
    await db.resetLoginAttempt(email);
  }
}

export const bruteForceGuard = new BruteForceGuard();