import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  User, Client, SubscriptionPlan, Subscription,
  License, Payment, RefreshToken, AuditLog, LoginAttempt
} from './entities';

class DatabaseService {
  private pool: Pool | null = null;
  private isPostgresAvailable = false;

  // In-memory / persistent fallback stores
  public users: User[] = [];
  public clients: Client[] = [];
  public plans: SubscriptionPlan[] = [];
  public subscriptions: Subscription[] = [];
  public licenses: License[] = [];
  public payments: Payment[] = [];
  public refreshTokens: RefreshToken[] = [];
  public auditLogs: AuditLog[] = [];
  public loginAttempts: LoginAttempt[] = [];

  async initialize(): Promise<void> {
    try {
      this.pool = new Pool({
        connectionString: config.database.url,
        connectionTimeoutMillis: 2000
      });

      const client = await this.pool.connect();
      client.release();
      this.isPostgresAvailable = true;
      logger.info('Connected to PostgreSQL database successfully.');

      // Run schema initialization
      await this.runMigrations();
      // Hydrate the in-memory cache from Postgres so existing rows
      // (admin, plans, etc.) are visible to the application without
      // having to re-seed.
      await this.hydrateFromPostgres();
    } catch (err: any) {
      this.isPostgresAvailable = false;
      logger.warn(`PostgreSQL unavailable at ${config.database.url}: ${err.message}. Operating with high-performance In-Memory Datastore.`);
    }

    // Initialize default seed data in memory store
    this.seedDefaultData();
  }

  /**
   * Loads every row from the Postgres tables into the in-memory arrays.
   * This is what makes the application state actually match the database
   * when Postgres is configured: without it, the in-memory `db.users`
   * is empty even if the database has been seeded previously.
   */
  private async hydrateFromPostgres(): Promise<void> {
    if (!this.pool) return;
    try {
      const [u, c, p, s, l, pay, rt] = await Promise.all([
        this.pool.query('SELECT * FROM users'),
        this.pool.query('SELECT * FROM clients'),
        this.pool.query('SELECT * FROM subscription_plans'),
        this.pool.query('SELECT * FROM subscriptions'),
        this.pool.query('SELECT * FROM licenses'),
        this.pool.query('SELECT * FROM payments'),
        this.pool.query('SELECT * FROM refresh_tokens')
      ]);
      this.users = u.rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        password_hash: row.password_hash,
        original_password: row.original_password,
        first_name: row.first_name,
        last_name: row.last_name,
        role: row.role,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at
      }));
      this.clients = c.rows.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        company_name: row.company_name,
        phone: row.phone,
        country: row.country,
        city: row.city,
        address: row.address,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
      this.plans = p.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        price: Number(row.price),
        currency: row.currency,
        features: row.features || {},
        max_users: row.max_users,
        max_locations: row.max_locations,
        description: row.description,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
      this.subscriptions = s.rows.map((row: any) => ({
        id: row.id,
        client_id: row.client_id,
        plan_id: row.plan_id,
        license_key: row.license_key,
        status: row.status,
        activated_at: row.activated_at,
        expires_at: row.expires_at,
        cancelled_at: row.cancelled_at,
        auto_renew: row.auto_renew,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
      this.licenses = l.rows.map((row: any) => ({
        id: row.id,
        subscription_id: row.subscription_id,
        key: row.key,
        activation_count: row.activation_count,
        max_activations: row.max_activations,
        last_validated_at: row.last_validated_at,
        device_fingerprint: row.device_fingerprint,
        ip_address: row.ip_address,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
      this.payments = pay.rows.map((row: any) => ({
        id: row.id,
        subscription_id: row.subscription_id,
        stripe_payment_id: row.stripe_payment_id,
        amount: Number(row.amount),
        currency: row.currency,
        status: row.status,
        payment_method: row.payment_method,
        description: row.description,
        metadata: row.metadata || {},
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
      this.refreshTokens = rt.rows.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        token_hash: row.token_hash,
        expires_at: row.expires_at,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        is_revoked: row.is_revoked,
        created_at: row.created_at
      }));
      logger.info(
        `Hydrated in-memory cache from Postgres: users=${this.users.length}, plans=${this.plans.length}, licenses=${this.licenses.length}`
      );
    } catch (err: any) {
      logger.error('Failed to hydrate from Postgres:', err.message);
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.pool || !this.isPostgresAvailable) return;
    try {
      const schemaPath = path.resolve(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf-8');
        await this.pool.query(sql);
        logger.info('PostgreSQL schema initialized successfully.');
      }
    } catch (err: any) {
      logger.error('Failed to run schema migrations:', err.message);
    }
  }

  private seedDefaultData() {
    if (this.plans.length === 0) {
      const now = new Date();
      this.plans = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Starter',
          type: 'monthly',
          price: 29.00,
          currency: 'USD',
          features: { locations: 1, users: 5, basicReports: true, support: 'Email' },
          max_users: 5,
          max_locations: 1,
          description: 'Starter plan for small cafes (30 days license)',
          is_active: true,
          created_at: now,
          updated_at: now
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Professional',
          type: 'half_yearly',
          price: 149.00,
          currency: 'USD',
          features: { locations: 5, users: 20, advancedReports: true, support: 'Priority', customIntegrations: true },
          max_users: 20,
          max_locations: 5,
          description: 'Professional package for restaurants (180 days license)',
          is_active: true,
          created_at: now,
          updated_at: now
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          name: 'Enterprise',
          type: 'yearly',
          price: 499.00,
          currency: 'USD',
          features: { locations: 999, users: 999, allFeatures: true, support: '24/7 Dedicated Manager', customDevelopment: true },
          max_users: 9999,
          max_locations: 9999,
          description: 'Enterprise solution for restaurant chains (365 days license)',
          is_active: true,
          created_at: now,
          updated_at: now
        }
      ];
    }
  }

  // AUDIT LOGGING HELPER
  async createAuditLog(params: {
    userId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const log: AuditLog = {
      id: uuidv4(),
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      changes: params.changes || {},
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      created_at: new Date()
    };
    this.auditLogs.unshift(log);
    return log;
  }

  // ---- LOGIN ATTEMPTS (per-ACCOUNT, scoped by email only) ----
  //
  // The previous implementation used (email, device_fingerprint) as the
  // primary key, which had two failure modes:
  //
  //   1. A shared POS terminal used by 3 employees would create 3
  //      independent counters, defeating the lockout entirely.
  //   2. The same email logging in from a second device after a lock
  //      would create a NEW record and bypass the lock.
  //
  // The brute-force counter MUST be scoped to the account (email) so
  // that one user cannot bypass their own lockout by switching devices
  // and that a single account can be locked regardless of which device
  // is being used. device_fingerprint is still stored as audit data
  // but is not part of the uniqueness key.
  async getLoginAttemptByEmail(email: string): Promise<LoginAttempt | null> {
    if (this.isPostgresAvailable && this.pool) {
      const r = await this.pool.query(
        'SELECT * FROM login_attempts WHERE email = $1 LIMIT 1',
        [email.toLowerCase()]
      );
      if (r.rows[0]) return this.rowToLoginAttempt(r.rows[0]);
      return null;
    }
    return this.loginAttempts.find(a => a.email === email.toLowerCase()) || null;
  }

  async upsertLoginAttemptByEmail(record: Partial<LoginAttempt> & { email: string }): Promise<LoginAttempt> {
    const now = new Date();
    const email = record.email.toLowerCase();
    if (this.isPostgresAvailable && this.pool) {
      const r = await this.pool.query(
        `INSERT INTO login_attempts (email, device_fingerprint, ip_address, failed_attempts, blocked_until, last_failed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
         ON CONFLICT (email) DO UPDATE SET
           device_fingerprint = EXCLUDED.device_fingerprint,
           ip_address = EXCLUDED.ip_address,
           failed_attempts = EXCLUDED.failed_attempts,
           blocked_until = EXCLUDED.blocked_until,
           last_failed_at = EXCLUDED.last_failed_at,
           updated_at = EXCLUDED.updated_at
         RETURNING *`,
        [
          email,
          record.device_fingerprint || null,
          record.ip_address || null,
          record.failed_attempts ?? 0,
          record.blocked_until ?? null,
          record.last_failed_at ?? null,
          now
        ]
      );
      return this.rowToLoginAttempt(r.rows[0]);
    }
    const idx = this.loginAttempts.findIndex(a => a.email === email);
    const prev = idx >= 0 ? this.loginAttempts[idx] : undefined;
    const merged: LoginAttempt = {
      id: idx >= 0 ? this.loginAttempts[idx].id : uuidv4(),
      email,
      device_fingerprint: record.device_fingerprint || prev?.device_fingerprint || '',
      ip_address: record.ip_address || prev?.ip_address || '',
      failed_attempts: record.failed_attempts ?? 0,
      blocked_until: record.blocked_until ?? null,
      last_failed_at: record.last_failed_at ?? null,
      created_at: idx >= 0 ? this.loginAttempts[idx].created_at : now,
      updated_at: now
    };
    if (idx >= 0) this.loginAttempts[idx] = merged;
    else this.loginAttempts.push(merged);
    return merged;
  }

  async resetLoginAttempt(email: string) {
    if (this.isPostgresAvailable && this.pool) {
      await this.pool.query('DELETE FROM login_attempts WHERE email = $1', [email.toLowerCase()]);
      return;
    }
    this.loginAttempts = this.loginAttempts.filter(a => a.email !== email.toLowerCase());
  }

  private rowToLoginAttempt(row: any): LoginAttempt {
    return {
      id: row.id,
      email: row.email,
      device_fingerprint: row.device_fingerprint,
      ip_address: row.ip_address,
      failed_attempts: row.failed_attempts,
      blocked_until: row.blocked_until,
      last_failed_at: row.last_failed_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  // Legacy helpers retained for backward compatibility with admin unlock
  // endpoints that operate on a per-email basis anyway.
  async listLoginAttemptsByEmail(email: string): Promise<LoginAttempt[]> {
    const rec = await this.getLoginAttemptByEmail(email);
    return rec ? [rec] : [];
  }
}

export const db = new DatabaseService();
