import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/data-source';
import { CryptoUtil } from '../../utils/crypto';
import { MailerService } from '../../utils/mailer';
import { License, Subscription } from '../../database/entities';

export class LicensesService {
  async generateLicense(params: {
    subscriptionId?: string;
    clientId?: string;
    planId?: string;
    maxActivations?: number;
    daysValid?: number;
  }) {
    const key = CryptoUtil.generateLicenseKey();
    const now = new Date();

    let subId = params.subscriptionId;

    // If subscriptionId wasn't provided directly, create or link a subscription
    if (!subId && params.clientId && params.planId) {
      const plan = db.plans.find(p => p.id === params.planId);
      const days = params.daysValid || (plan?.type === 'yearly' ? 365 : plan?.type === 'half_yearly' ? 180 : 30);
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const sub: Subscription = {
        id: uuidv4(),
        client_id: params.clientId,
        plan_id: params.planId,
        license_key: key,
        status: 'active',
        activated_at: now,
        expires_at: expiresAt,
        auto_renew: true,
        created_at: now,
        updated_at: now
      };
      db.subscriptions.push(sub);
      subId = sub.id;
    }

    const license: License = {
      id: uuidv4(),
      subscription_id: subId || '',
      key,
      activation_count: 0,
      max_activations: params.maxActivations || 5,
      last_validated_at: null,
      device_fingerprint: null,
      ip_address: null,
      status: 'active',
      created_at: now,
      updated_at: now
    };

    db.licenses.push(license);

    await db.createAuditLog({
      action: 'LICENSE_GENERATED',
      resourceType: 'license',
      resourceId: license.id,
      changes: { key: license.key, maxActivations: license.max_activations }
    });

    return license;
  }

  async validateLicense(key: string) {
    const normalizedKey = key.trim().toUpperCase();
    if (!CryptoUtil.validateLicenseKeyFormat(normalizedKey)) {
      return { valid: false, reason: 'Invalid license key format. Expected XXXX-XXXX-XXXX-XXXX.' };
    }

    const license = db.licenses.find(l => l.key === normalizedKey);
    if (!license) {
      return { valid: false, reason: 'License key not found.' };
    }

    if (license.status === 'revoked') {
      return { valid: false, reason: 'License has been revoked.' };
    }

    // Check linked subscription
    const subscription = db.subscriptions.find(s => s.id === license.subscription_id);
    if (subscription) {
      if (new Date() > new Date(subscription.expires_at)) {
        license.status = 'expired';
        subscription.status = 'expired';
        return { valid: false, reason: 'License and subscription have expired.' };
      }
    }

    // Update last validated timestamp
    license.last_validated_at = new Date();
    license.updated_at = new Date();

    const plan = subscription ? db.plans.find(p => p.id === subscription.plan_id) : null;
    const client = subscription ? db.clients.find(c => c.id === subscription.client_id) : null;

    return {
      valid: true,
      licenseId: license.id,
      key: license.key,
      status: license.status,
      activations: license.activation_count,
      maxActivations: license.max_activations,
      expiresAt: subscription ? subscription.expires_at : null,
      plan: plan ? {
        id: plan.id,
        name: plan.name,
        type: plan.type,
        features: plan.features,
        maxUsers: plan.max_users,
        maxLocations: plan.max_locations
      } : null,
      client: client ? {
        companyName: client.company_name
      } : null
    };
  }

  async activateLicense(key: string, deviceFingerprint: string, ip: string) {
    const normalizedKey = key.trim().toUpperCase();
    const license = db.licenses.find(l => l.key === normalizedKey);

    if (!license) {
      throw new Error('License key not found');
    }

    if (license.status === 'revoked') {
      throw new Error('License key has been revoked by administration');
    }

    const subscription = db.subscriptions.find(s => s.id === license.subscription_id);
    if (subscription && new Date() > new Date(subscription.expires_at)) {
      license.status = 'expired';
      throw new Error('Subscription has expired');
    }

    if (license.activation_count >= license.max_activations) {
      throw new Error(`Maximum activations reached (${license.max_activations}/${license.max_activations})`);
    }

    license.activation_count += 1;
    license.device_fingerprint = deviceFingerprint;
    license.ip_address = ip;
    license.last_validated_at = new Date();
    license.updated_at = new Date();

    if (subscription) {
      subscription.status = 'active';
      subscription.activated_at = subscription.activated_at || new Date();
    }

    const plan = subscription ? db.plans.find(p => p.id === subscription.plan_id) : null;
    const client = subscription ? db.clients.find(c => c.id === subscription.client_id) : null;
    const user = client ? db.users.find(u => u.id === client.user_id) : null;

    if (user && plan) {
      MailerService.sendLicenseActivated(user.email, license.key, plan.name, subscription!.expires_at);
    }

    await db.createAuditLog({
      userId: user?.id,
      action: 'LICENSE_ACTIVATED',
      resourceType: 'license',
      resourceId: license.id,
      changes: { deviceFingerprint, ip, activationCount: license.activation_count }
    });

    return {
      success: true,
      message: 'License activated successfully',
      key: license.key,
      plan: plan?.name || 'Custom',
      expiresAt: subscription?.expires_at,
      activations: `${license.activation_count}/${license.max_activations}`
    };
  }

  async getLicense(id: string) {
    const license = db.licenses.find(l => l.id === id || l.key === id.toUpperCase());
    if (!license) throw new Error('License not found');

    const subscription = db.subscriptions.find(s => s.id === license.subscription_id);
    const plan = subscription ? db.plans.find(p => p.id === subscription.plan_id) : null;
    const client = subscription ? db.clients.find(c => c.id === subscription.client_id) : null;
    // The owner user was referenced below but never resolved (compile error
    // that broke the whole test suite). Resolve it from the client record.
    const user = client ? db.users.find(u => u.id === client.user_id) : null;

    return {
      ...license,
      subscription,
      plan,
      client: client ? {
        ...client,
        userEmail: user?.email,
        userOriginalPassword: user?.original_password || null
      } : null
    };
  }

  async updateLicense(id: string, updates: { maxActivations?: number; status?: 'active' | 'revoked' | 'expired' }) {
    const license = db.licenses.find(l => l.id === id);
    if (!license) throw new Error('License not found');

    if (updates.maxActivations !== undefined) license.max_activations = updates.maxActivations;
    if (updates.status) license.status = updates.status;
    license.updated_at = new Date();

    await db.createAuditLog({
      action: 'LICENSE_UPDATED',
      resourceType: 'license',
      resourceId: license.id,
      changes: updates
    });

    return license;
  }

  async revokeLicense(id: string) {
    const license = db.licenses.find(l => l.id === id);
    if (!license) throw new Error('License not found');

    license.status = 'revoked';
    license.updated_at = new Date();

    const subscription = db.subscriptions.find(s => s.id === license.subscription_id);
    if (subscription) {
      subscription.status = 'suspended';
    }

    await db.createAuditLog({
      action: 'LICENSE_REVOKED',
      resourceType: 'license',
      resourceId: license.id
    });

    return { success: true, message: 'License revoked successfully' };
  }

  /**
   * Releases an activation slot on a license for a specific device, allowing
   * the same key to be activated on a different machine. Used by the
   * `crm-license deactivate` CLI command.
   */
  async deactivateLicense(key: string, deviceFingerprint: string) {
    const normalizedKey = key.trim().toUpperCase();
    const license = db.licenses.find(l => l.key === normalizedKey);
    if (!license) throw new Error('License not found');

    if (license.device_fingerprint === deviceFingerprint || !license.device_fingerprint) {
      const previousFingerprint = license.device_fingerprint;
      license.activation_count = Math.max(0, license.activation_count - 1);
      license.device_fingerprint = null;
      license.ip_address = null;
      license.last_validated_at = new Date();
      license.updated_at = new Date();

      await db.createAuditLog({
        action: 'LICENSE_DEACTIVATED',
        resourceType: 'license',
        resourceId: license.id,
        changes: { previousFingerprint, activationCount: license.activation_count }
      });

      return {
        success: true,
        message: 'Activation released. The license can now be activated on another device.',
        activationCount: license.activation_count,
        maxActivations: license.max_activations
      };
    }

    throw new Error('This license was not bound to the provided device fingerprint');
  }

  async listLicenses(query?: { status?: string; planType?: string; search?: string }) {
    let list = [...db.licenses];

    if (query?.status) {
      list = list.filter(l => l.status === query.status);
    }

    return list.map(l => {
      const subscription = db.subscriptions.find(s => s.id === l.subscription_id);
      const plan = subscription ? db.plans.find(p => p.id === subscription.plan_id) : null;
      const client = subscription ? db.clients.find(c => c.id === subscription.client_id) : null;
      const user = client ? db.users.find(u => u.id === client.user_id) : null;

      return {
        ...l,
        subscription,
        plan,
        client: client ? {
          ...client,
          userEmail: user?.email,
          userOriginalPassword: user?.original_password || null,
          userStatus: user?.status
        } : null
      };
    }).filter(item => {
      if (!query?.search) return true;
      const term = query.search.toLowerCase();
      return (
        item.key.toLowerCase().includes(term) ||
        item.client?.company_name?.toLowerCase().includes(term) ||
        item.client?.userEmail?.toLowerCase().includes(term)
      );
    });
  }
}

export const licensesService = new LicensesService();
