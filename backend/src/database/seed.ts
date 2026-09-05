import { v4 as uuidv4 } from 'uuid';
import { db } from './data-source';
import { CryptoUtil } from '../utils/crypto';
import { logger } from '../utils/logger';

/**
 * Idempotent upsert of a user. If Postgres is connected, the row is
 * written to the `users` table; the in-memory cache is also updated so
 * the running process sees the new credentials immediately.
 */
async function upsertUser(user: {
  id: string;
  email: string;
  passwordHash: string;
  originalPassword: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'client';
  now: Date;
}) {
  const { id, email, passwordHash, originalPassword, firstName, lastName, role, now } = user;
  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  const record = {
    id: existing?.id || id,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    original_password: originalPassword,
    first_name: firstName,
    last_name: lastName,
    role: role as any,
    status: 'active' as const,
    created_at: existing?.created_at || now,
    updated_at: now,
    deleted_at: null as any
  };
  if (existing) {
    Object.assign(existing, record);
  } else {
    db.users.push(record);
  }

  // Mirror to Postgres so a future restart hydrates the user back.
  const pg = (db as any).pool as { query: (sql: string, params: any[]) => Promise<any> } | null;
  const pgAvailable = (db as any).isPostgresAvailable as boolean;
  if (pg && pgAvailable) {
    try {
      await pg.query(
        `INSERT INTO users (id, email, password_hash, original_password, first_name, last_name, role, status, created_at, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           original_password = EXCLUDED.original_password,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           role = EXCLUDED.role,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at,
           deleted_at = NULL`,
        [
          record.id,
          record.email,
          record.password_hash,
          record.original_password,
          record.first_name,
          record.last_name,
          record.role,
          record.status,
          record.created_at,
          record.updated_at,
          null
        ]
      );
    } catch (err: any) {
      logger.warn(`Could not persist user ${email} to Postgres: ${err.message}`);
    }
  }
}

export async function runSeed() {
  logger.info('Running database seed...');
  await db.initialize();

  const now = new Date();
  const passwordHash = await CryptoUtil.hashPassword('Admin@123456');
  const clientPassHash = await CryptoUtil.hashPassword('Client@123456');

  // Admin user
  await upsertUser({
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@crm-restaurant.com',
    passwordHash,
    originalPassword: 'Admin@123456',
    firstName: 'Alex',
    lastName: 'Admin',
    role: 'admin',
    now
  });
  logger.info('Seeded Admin user: admin@crm-restaurant.com / Admin@123456');

  // Client user
  await upsertUser({
    id: 'c0000000-0000-0000-0000-000000000002',
    email: 'client@bistro.com',
    passwordHash: clientPassHash,
    originalPassword: 'Client@123456',
    firstName: 'Marco',
    lastName: 'Rossi',
    role: 'client',
    now
  });

  // Client record + subscription + license (only on first run)
  if (!db.clients.find(c => c.user_id === 'c0000000-0000-0000-0000-000000000002')) {
    const clientId = 'd0000000-0000-0000-0000-000000000003';
    const subId = 'e0000000-0000-0000-0000-000000000004';
    const licenseId = 'f0000000-0000-0000-0000-000000000005';
    const paymentId = '90000000-0000-0000-0000-000000000006';
    const proPlan = db.plans.find(p => p.name === 'Professional') || db.plans[1];
    const expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    const sampleKey = 'A1B2-C3D4-E5F6-G7H8';

    db.clients.push({
      id: clientId,
      user_id: 'c0000000-0000-0000-0000-000000000002',
      company_name: 'Bella Italia Bistro',
      phone: '+1 (555) 234-5678',
      country: 'United States',
      city: 'Chicago',
      address: '742 Evergreen Terrace',
      created_at: now,
      updated_at: now
    });
    db.subscriptions.push({
      id: subId,
      client_id: clientId,
      plan_id: proPlan.id,
      license_key: sampleKey,
      status: 'active' as const,
      activated_at: now,
      expires_at: expiresAt,
      cancelled_at: null,
      auto_renew: true,
      created_at: now,
      updated_at: now
    });
    db.licenses.push({
      id: licenseId,
      subscription_id: subId,
      key: sampleKey,
      activation_count: 1,
      max_activations: 5,
      last_validated_at: now,
      device_fingerprint: 'demo-pos-terminal-fingerprint-01',
      ip_address: '127.0.0.1',
      status: 'active' as const,
      created_at: now,
      updated_at: now
    });
    db.payments.push({
      id: paymentId,
      subscription_id: subId,
      stripe_payment_id: 'ch_seed_bella_italia_149',
      amount: proPlan.price,
      currency: 'USD',
      status: 'completed' as const,
      payment_method: 'credit_card',
      description: 'Initial subscription payment - Professional Plan',
      metadata: { seed: true },
      created_at: now,
      updated_at: now
    });
    logger.info(`Seeded Client: client@bistro.com / Client@123456 (Key: ${sampleKey})`);
  }

  logger.info('Database seed finished successfully.');
}

if (require.main === module) {
  runSeed().catch(err => {
    logger.error('Seed execution failed:', err);
    process.exit(1);
  });
}
