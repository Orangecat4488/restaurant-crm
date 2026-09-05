import { bruteForceGuard, LOCK_DURATION_SECONDS } from '../../../utils/bruteForceGuard';
import { db } from '../../../database/data-source';
import { authService, LockedError, InvalidCredentialsError } from '../auth.service';
import { v4 as uuidv4 } from 'uuid';
import { CryptoUtil } from '../../../utils/crypto';

/**
 * Regression tests for the multi-tenant, per-account brute force
 * protection and auth-isolation invariants. The numbers below were the
 * exact requirements from the security audit.
 */
describe('Brute force & auth isolation', () => {
  beforeAll(async () => {
    await db.initialize();
  });

  beforeEach(async () => {
    // Reset all brute force counters and users between tests.
    db.users = db.users.filter(u => u.email.startsWith('test-'));
    // Deduplicate by email, keeping the MOST RECENTLY created record —
    // tests re-create users with the same email and must be able to
    // reference the exact record they just created.
    const lastByEmail = new Map<string, any>();
    db.users.forEach(u => lastByEmail.set(u.email, u));
    db.users = [...lastByEmail.values()];
    db.loginAttempts = [];
    if ((db as any).isPostgresAvailable && (db as any).pool) {
      await (db as any).pool.query("DELETE FROM login_attempts WHERE email LIKE 'test-%'");
      await (db as any).pool.query("DELETE FROM users WHERE email LIKE 'test-%'");
    }
  });

  async function makeUser(email: string, password: string) {
    // Replace any existing user with this email so the record the test
    // just created is the only one the login lookup can ever find.
    db.users = db.users.filter(u => u.email !== email);
    const now = new Date();
    const u = {
      id: uuidv4(),
      email,
      password_hash: await CryptoUtil.hashPassword(password),
      first_name: 'Test',
      last_name: 'User',
      role: 'client' as const,
      status: 'active' as const,
      created_at: now,
      updated_at: now,
      deleted_at: null as any
    };
    db.users.push(u);
    return u;
  }

  // ---- Test A: isolated brute force ----
  // NOTE: the 5th failed attempt itself triggers the lock and is answered
  // with LockedError (+ server-issued retryAfter) — the same behavior as
  // the restaurant server, per the audit requirements.
  it('locks only the offending account for exactly 60s', async () => {
    await makeUser('test-a@example.com', 'CorrectPass1!');
    await makeUser('test-b@example.com', 'CorrectPass1!');
    await makeUser('test-c@example.com', 'CorrectPass1!');

    for (let i = 0; i < 4; i++) {
      await expect(
        authService.login('test-a@example.com', 'wrong', '127.0.0.1')
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    }
    // 5th wrong attempt triggers the per-account lock
    await expect(
      authService.login('test-a@example.com', 'wrong', '127.0.0.1')
    ).rejects.toBeInstanceOf(LockedError);

    // B and C must still be able to log in
    const b = await authService.login('test-b@example.com', 'CorrectPass1!', '127.0.0.1');
    expect(b.user.email).toBe('test-b@example.com');
    const c = await authService.login('test-c@example.com', 'CorrectPass1!', '127.0.0.1');
    expect(c.user.email).toBe('test-c@example.com');
  });

  // ---- Test B: independent locks ----
  it('locks A and B independently when both fail 5 times', async () => {
    await makeUser('test-a@example.com', 'CorrectPass1!');
    await makeUser('test-b@example.com', 'CorrectPass1!');

    for (const email of ['test-a@example.com', 'test-b@example.com']) {
      for (let i = 0; i < 4; i++) {
        await expect(
          authService.login(email, 'wrong', '127.0.0.1')
        ).rejects.toBeInstanceOf(InvalidCredentialsError);
      }
      await expect(
        authService.login(email, 'wrong', '127.0.0.1')
      ).rejects.toBeInstanceOf(LockedError);
    }

    await expect(
      authService.login('test-a@example.com', 'CorrectPass1!', '127.0.0.1')
    ).rejects.toBeInstanceOf(LockedError);
    await expect(
      authService.login('test-b@example.com', 'CorrectPass1!', '127.0.0.1')
    ).rejects.toBeInstanceOf(LockedError);
  });

  // ---- Test C: reset only the authenticated user's own attempts ----
  it('resets only the successful account, leaves others untouched', async () => {
    const a = await makeUser('test-a@example.com', 'CorrectPass1!');
    await makeUser('test-b@example.com', 'CorrectPass1!');

    for (let i = 0; i < 4; i++) {
      await expect(
        authService.login('test-a@example.com', 'wrong', '127.0.0.1')
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    }
    for (let i = 0; i < 3; i++) {
      await expect(
        authService.login('test-b@example.com', 'wrong', '127.0.0.1')
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    }

    // A succeeds
    const ok = await authService.login('test-a@example.com', 'CorrectPass1!', '127.0.0.1');
    expect(ok.user.id).toBe(a.id);

    // A is fully reset
    const aCheck = await bruteForceGuard.check('test-a@example.com');
    expect(aCheck.locked).toBe(false);
    expect(aCheck.failedAttempts).toBe(0);

    // B is untouched
    const bCheck = await bruteForceGuard.check('test-b@example.com');
    expect(bCheck.locked).toBe(false);
    expect(bCheck.failedAttempts).toBe(3);
  });

  // ---- Test D: lock expiration ----
  it('auto-unlocks after exactly 60 seconds', async () => {
    await makeUser('test-a@example.com', 'CorrectPass1!');

    const realNow = Date.now;
    let now = realNow();
    const spy = jest.spyOn(Date, 'now').mockImplementation(() => now);

    try {
      for (let i = 0; i < 4; i++) {
        await expect(
          authService.login('test-a@example.com', 'wrong', '127.0.0.1')
        ).rejects.toBeInstanceOf(InvalidCredentialsError);
      }
      await expect(
        authService.login('test-a@example.com', 'wrong', '127.0.0.1')
      ).rejects.toBeInstanceOf(LockedError);
      await expect(
        authService.login('test-a@example.com', 'CorrectPass1!', '127.0.0.1')
      ).rejects.toBeInstanceOf(LockedError);

      const lock = await bruteForceGuard.check('test-a@example.com');
      expect(lock.locked).toBe(true);
      expect(lock.remainingSeconds).toBe(LOCK_DURATION_SECONDS);

      // 59 seconds in: still locked
      now += 59_000;
      const stillLocked = await bruteForceGuard.check('test-a@example.com');
      expect(stillLocked.locked).toBe(true);

      // 60 seconds in: auto-unlocked
      now += 2_000;
      const free = await bruteForceGuard.check('test-a@example.com');
      expect(free.locked).toBe(false);
      expect(free.failedAttempts).toBe(0);

      // Login now succeeds with the original password
      const ok = await authService.login('test-a@example.com', 'CorrectPass1!', '127.0.0.1');
      expect(ok.user.email).toBe('test-a@example.com');
    } finally {
      spy.mockRestore();
    }
  });

  // ---- Test E: lock is exactly LOCK_DURATION_SECONDS (not 772s) ----
  it('returns retryAfter = 60 (not 772)', async () => {
    await makeUser('test-a@example.com', 'CorrectPass1!');
    for (let i = 0; i < 4; i++) {
      await expect(
        authService.login('test-a@example.com', 'wrong', '127.0.0.1')
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    }
    // The 5th wrong attempt triggers the lock and reports retryAfter
    try {
      await authService.login('test-a@example.com', 'wrong', '127.0.0.1');
      fail('should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(LockedError);
      expect(err.retryAfter).toBe(60);
      const delta = new Date(err.lockedUntil).getTime() - Date.now();
      expect(delta).toBeGreaterThan(55_000);
      expect(delta).toBeLessThanOrEqual(60_000);
    }
  });
});