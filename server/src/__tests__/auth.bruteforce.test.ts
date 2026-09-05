/**
 * Regression tests for the per-account brute-force lock (Test matrix A–E).
 *
 * Run with:  cd server && npm test
 *
 * The lock lives on the user row (`locked_until`) and is therefore
 * per-account by construction. These tests verify:
 *   A — isolated brute force: A wrong × 5 → A locked 60s; B and C can login.
 *   B — independent locks: A and B each locked separately; C unaffected.
 *   C — successful login resets ONLY own attempts.
 *   D — lock expiration: after 60s the user can login again.
 *   E — retryAfter is exactly 60 (never 772/773).
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DB_PATH must be set BEFORE the config module is imported — point the
// suite at a throwaway SQLite database so the real data is never touched.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-bruteforce-test-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');
process.env.NODE_ENV = 'test';

const { initializeDatabase } = await import('../utils/initDb.js');
const { getDb } = await import('../config/database.js');
const { login } = await import('../controllers/authController.js');
const {
  createUser,
  getUserByEmail,
  recordFailedLogin,
  getUserLockStatus,
  verifyPassword,
  LOGIN_LOCK_DURATION_SECONDS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} = await import('../models/user.js');

await initializeDatabase();

interface LoginErrorBody {
  success?: boolean;
  error?: string;
  message?: string;
  retryAfter?: number;
  lockedUntil?: string | null;
}

interface MockResponse {
  statusCode: number;
  body: LoginErrorBody;
  headers: Record<string, string>;
  status(code: number): MockResponse;
  json(payload: LoginErrorBody): MockResponse;
  setHeader(key: string, value: string): MockResponse;
  cookie(): MockResponse;
  clearCookie(): MockResponse;
}

function mockRes(): MockResponse {
  const res: MockResponse = {
    // Express defaults to 200 when the handler calls res.json() directly;
    // error paths always call res.status(code) explicitly.
    statusCode: 200,
    body: {},
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
      return this;
    },
    cookie() {
      return this;
    },
    clearCookie() {
      return this;
    },
  };
  return res;
}

/** Calls the login controller with express-compatible casted arguments. */
async function callLogin(email: string, password: string): Promise<MockResponse> {
  const res = mockRes();
  const req = { body: { email, password } } as unknown as Parameters<typeof login>[0];
  await login(req, res as unknown as Parameters<typeof login>[1]);
  return res;
}

/** Drives the login endpoint with a wrong password N times. */
async function wrongAttempts(email: string, n: number): Promise<MockResponse[]> {
  const responses: MockResponse[] = [];
  for (let i = 0; i < n; i++) {
    responses.push(await callLogin(email, 'WrongPassword!1'));
  }
  return responses;
}

const SUFFIX = Date.now().toString(36);
const EMAILS = {
  a: `brute-a-${SUFFIX}@test.local`,
  b: `brute-b-${SUFFIX}@test.local`,
  c: `brute-c-${SUFFIX}@test.local`,
};

beforeEach(async () => {
  // Ensure all three test accounts exist and are unlocked/clean.
  const db = await getDb();
  for (const email of Object.values(EMAILS)) {
    let user = await getUserByEmail(email);
    if (!user) {
      await createUser('Brute Test', email, 'CorrectPass1!', 'manager');
      user = await getUserByEmail(email);
    }
    await db.run(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`,
      [user!.id]
    );
  }
});

test('A: isolated brute force — A locked 60s, B and C can login', async () => {
  const responses = await wrongAttempts(EMAILS.a, MAX_FAILED_LOGIN_ATTEMPTS);

  // First 4 failures are generic 401s...
  for (let i = 0; i < MAX_FAILED_LOGIN_ATTEMPTS - 1; i++) {
    assert.equal(responses[i].statusCode, 401, `attempt ${i + 1} must be 401`);
  }
  // ...the 5th triggers the per-account lock.
  const last = responses[MAX_FAILED_LOGIN_ATTEMPTS - 1];
  assert.equal(last.statusCode, 423);
  assert.equal(last.body.error, 'AccountLocked');
  assert.equal(last.body.retryAfter, LOGIN_LOCK_DURATION_SECONDS);

  // User B and User C are NOT affected — they log in successfully.
  const resB = await callLogin(EMAILS.b, 'CorrectPass1!');
  assert.equal(resB.statusCode, 200, 'User B must be able to login');
  const resC = await callLogin(EMAILS.c, 'CorrectPass1!');
  assert.equal(resC.statusCode, 200, 'User C must be able to login');
});

test('B: independent locks — A and B locked separately, C unaffected', async () => {
  // Lock A first (beforeEach resets state between tests).
  const wrongA = await wrongAttempts(EMAILS.a, MAX_FAILED_LOGIN_ATTEMPTS);
  assert.equal(wrongA[MAX_FAILED_LOGIN_ATTEMPTS - 1].statusCode, 423);

  // B gets its OWN independent lock.
  const wrongB = await wrongAttempts(EMAILS.b, MAX_FAILED_LOGIN_ATTEMPTS);
  const lastB = wrongB[MAX_FAILED_LOGIN_ATTEMPTS - 1];
  assert.equal(lastB.statusCode, 423);
  assert.equal(lastB.body.retryAfter, LOGIN_LOCK_DURATION_SECONDS);

  const userA = await getUserByEmail(EMAILS.a);
  const lockA = await getUserLockStatus(userA!);
  const userB = await getUserByEmail(EMAILS.b);
  const lockB = await getUserLockStatus(userB!);
  assert.equal(lockA.locked, true, 'A must have its own lock');
  assert.equal(lockB.locked, true, 'B must have its own lock');
  assert.notEqual(lockA.lockedUntil, lockB.lockedUntil, 'locks must be independent records');

  // C is still unaffected.
  const resC = await callLogin(EMAILS.c, 'CorrectPass1!');
  assert.equal(resC.statusCode, 200, 'User C must remain unaffected');
});

test('C: successful login resets ONLY own attempts', async () => {
  // A: 4 wrong, B: 3 wrong.
  await wrongAttempts(EMAILS.a, 4);
  await wrongAttempts(EMAILS.b, 3);

  const userA = await getUserByEmail(EMAILS.a);
  const userB = await getUserByEmail(EMAILS.b);
  assert.equal(userA!.failedLoginAttempts, 4);
  assert.equal(userB!.failedLoginAttempts, 3);

  // A logs in successfully.
  const ok = await callLogin(EMAILS.a, 'CorrectPass1!');
  assert.equal(ok.statusCode, 200);

  const afterA = await getUserByEmail(EMAILS.a);
  const afterB = await getUserByEmail(EMAILS.b);
  assert.equal(afterA!.failedLoginAttempts, 0, 'A attempts must reset to 0');
  assert.equal(afterA!.lockedUntil, null);
  assert.equal(afterB!.failedLoginAttempts, 3, 'B attempts must stay at 3');
  assert.equal(afterB!.lockedUntil, null, 'B must not be locked');
});

test('D: lock expiration — after 60s the user can login again', async () => {
  await wrongAttempts(EMAILS.a, MAX_FAILED_LOGIN_ATTEMPTS);
  const locked = await getUserByEmail(EMAILS.a);
  assert.equal((await getUserLockStatus(locked!)).locked, true);

  // Simulate the passage of time: push the lock 61s into the past.
  const db = await getDb();
  const past = new Date(Date.now() - (LOGIN_LOCK_DURATION_SECONDS + 1) * 1000).toISOString();
  await db.run(`UPDATE users SET locked_until = ? WHERE id = ?`, [past, locked!.id]);

  // The expired lock must not keep the user locked out, and the stale
  // counter must have been cleaned up by getUserLockStatus.
  const afterExpiry = await getUserByEmail(EMAILS.a);
  const status = await getUserLockStatus(afterExpiry!);
  assert.equal(status.locked, false);
  assert.equal(status.failedLoginAttempts, 0);

  const ok = await callLogin(EMAILS.a, 'CorrectPass1!');
  assert.equal(ok.statusCode, 200, 'login must succeed after lock expiry');
});

test('E: retryAfter is exactly 60 seconds (never 772)', async () => {
  const responses = await wrongAttempts(EMAILS.c, MAX_FAILED_LOGIN_ATTEMPTS);
  const last = responses[MAX_FAILED_LOGIN_ATTEMPTS - 1];

  assert.equal(last.statusCode, 423);
  assert.equal(last.body.retryAfter, 60, 'retryAfter must be 60s');
  assert.equal(last.headers['retry-after'], '60', 'Retry-After header must be 60');

  const deltaMs = new Date(last.body.lockedUntil ?? 0).getTime() - Date.now();
  assert.ok(deltaMs > 55_000, `lockedUntil must be ~60s away, got ${deltaMs}ms`);
  assert.ok(deltaMs <= 60_000, `lockedUntil must not exceed 60s, got ${deltaMs}ms`);

  // The same account is reported consistently on subsequent attempts.
  const again = await callLogin(EMAILS.c, 'CorrectPass1!');
  assert.equal(again.statusCode, 423);
  const againRetry = again.body.retryAfter ?? 0;
  assert.ok(againRetry > 0 && againRetry <= 60);
});

test('model level: recordFailedLogin returns status and never escalates', async () => {
  const email = `brute-model-${SUFFIX}@test.local`;
  await createUser('Model Test', email, 'CorrectPass1!', 'manager');
  const user = (await getUserByEmail(email))!;

  for (let i = 1; i <= MAX_FAILED_LOGIN_ATTEMPTS; i++) {
    const status = await recordFailedLogin(user.id);
    assert.equal(status.failedLoginAttempts, i);
  }

  // While locked, the status is stable — no escalation beyond 60s.
  const fresh = (await getUserByEmail(email))!;
  const status = await getUserLockStatus(fresh);
  assert.equal(status.locked, true);
  assert.ok(status.remainingSeconds <= LOGIN_LOCK_DURATION_SECONDS);
  assert.equal(await verifyPassword(fresh, 'CorrectPass1!'), true);
});
