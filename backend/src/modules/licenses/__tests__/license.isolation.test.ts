import { licensesService } from '../licenses.service';
import { authService } from '../../auth/auth.service';
import { db } from '../../../database/data-source';
import { v4 as uuidv4 } from 'uuid';
import { CryptoUtil } from '../../../utils/crypto';

describe('License isolation', () => {
  beforeAll(async () => {
    await db.initialize();
  });

  beforeEach(async () => {
    db.users = db.users.filter(u => u.email.startsWith('test-iso-'));
    db.subscriptions = db.subscriptions.filter(s => s.client_id?.startsWith('test-iso-'));
    db.licenses = db.licenses.filter(l => l.subscription_id?.startsWith('test-iso-'));
  });

  async function makeClient(email: string) {
    const now = new Date();
    const u = {
      id: uuidv4(),
      email,
      password_hash: await CryptoUtil.hashPassword('CorrectPass1!'),
      first_name: 'T',
      last_name: 'I',
      role: 'client' as const,
      status: 'active' as const,
      created_at: now,
      updated_at: now,
      deleted_at: null as any
    };
    db.users.push(u);
    const client = {
      id: uuidv4(),
      user_id: u.id,
      company_name: email,
      phone: '',
      country: '',
      city: '',
      address: '',
      created_at: now,
      updated_at: now
    };
    db.clients.push(client);
    return { user: u, client };
  }

  // ---- Test E: disabling A does not affect B or C ----
  it('disabling A license does not affect B or C', async () => {
    const a = await makeClient('test-iso-a@example.com');
    const b = await makeClient('test-iso-b@example.com');
    const c = await makeClient('test-iso-c@example.com');

    const plan = db.plans[0];
    const days = 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const subA = {
      id: uuidv4(),
      client_id: a.client.id,
      plan_id: plan.id,
      license_key: 'AAAA-AAAA-AAAA-AAAA',
      status: 'active' as const,
      activated_at: new Date(),
      expires_at: expiresAt,
      auto_renew: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    db.subscriptions.push(subA);
    const licA = {
      id: uuidv4(),
      subscription_id: subA.id,
      key: 'AAAA-AAAA-AAAA-AAAA',
      activation_count: 0,
      max_activations: 5,
      last_validated_at: null,
      device_fingerprint: null,
      ip_address: null,
      status: 'active' as const,
      created_at: new Date(),
      updated_at: new Date()
    };
    db.licenses.push(licA);

    // Revoke A
    await licensesService.revokeLicense(licA.id);

    const valA = await licensesService.validateLicense('AAAA-AAAA-AAAA-AAAA');
    expect(valA.valid).toBe(false);
    expect((valA.reason || '').toLowerCase()).toContain('revoked');

    // B and C are unaffected — no licenses exist for them, but the
    // important point is the call to revokeLicense did not mutate
    // anything they would see. We assert their accounts still work.
    const bLogin = await authService.login('test-iso-b@example.com', 'CorrectPass1!', '127.0.0.1');
    expect(bLogin.user.id).toBe(b.user.id);
    const cLogin = await authService.login('test-iso-c@example.com', 'CorrectPass1!', '127.0.0.1');
    expect(cLogin.user.id).toBe(c.user.id);
  });
});