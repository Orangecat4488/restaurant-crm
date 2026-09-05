import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/data-source';
import { CryptoUtil } from '../../utils/crypto';
import { MailerService } from '../../utils/mailer';
import { Subscription, SubscriptionPlan, License, Payment } from '../../database/entities';

export class SubscriptionsService {
  async getPlans() {
    return db.plans.filter(p => p.is_active);
  }

  async getAllPlans() {
    return db.plans;
  }

  async createPlan(data: {
    name: string;
    type: 'monthly' | 'half_yearly' | 'yearly';
    price: number;
    currency?: string;
    features: Record<string, any>;
    maxUsers?: number;
    maxLocations?: number;
    description?: string;
  }) {
    const now = new Date();
    const plan: SubscriptionPlan = {
      id: uuidv4(),
      name: data.name,
      type: data.type,
      price: data.price,
      currency: data.currency || 'USD',
      features: data.features,
      max_users: data.maxUsers,
      max_locations: data.maxLocations,
      description: data.description,
      is_active: true,
      created_at: now,
      updated_at: now
    };
    db.plans.push(plan);
    return plan;
  }

  async updatePlan(id: string, updates: Partial<SubscriptionPlan>) {
    const plan = db.plans.find(p => p.id === id);
    if (!plan) throw new Error('Plan not found');
    Object.assign(plan, updates, { updated_at: new Date() });
    return plan;
  }

  async createSubscription(clientId: string, planId: string, autoRenew = true) {
    const client = db.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Client not found');

    const plan = db.plans.find(p => p.id === planId);
    if (!plan) throw new Error('Subscription plan not found');

    const now = new Date();
    const durationDays = plan.type === 'yearly' ? 365 : plan.type === 'half_yearly' ? 180 : 30;
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const licenseKey = CryptoUtil.generateLicenseKey();

    const subscription: Subscription = {
      id: uuidv4(),
      client_id: clientId,
      plan_id: planId,
      license_key: licenseKey,
      status: 'active',
      activated_at: now,
      expires_at: expiresAt,
      cancelled_at: null,
      auto_renew: autoRenew,
      created_at: now,
      updated_at: now
    };
    db.subscriptions.push(subscription);

    // Automatically create accompanying License record
    const license: License = {
      id: uuidv4(),
      subscription_id: subscription.id,
      key: licenseKey,
      activation_count: 0,
      max_activations: 5,
      last_validated_at: null,
      device_fingerprint: null,
      ip_address: null,
      status: 'active',
      created_at: now,
      updated_at: now
    };
    db.licenses.push(license);

    // Record completed payment
    const payment: Payment = {
      id: uuidv4(),
      subscription_id: subscription.id,
      stripe_payment_id: `ch_mock_${Date.now()}`,
      amount: plan.price,
      currency: plan.currency,
      status: 'completed',
      payment_method: 'credit_card',
      description: `Payment for ${plan.name} plan (${plan.type})`,
      metadata: { autoRenew },
      created_at: now,
      updated_at: now
    };
    db.payments.push(payment);

    await db.createAuditLog({
      action: 'SUBSCRIPTION_CREATED',
      resourceType: 'subscription',
      resourceId: subscription.id,
      changes: { plan: plan.name, licenseKey }
    });

    return { subscription, license, payment };
  }

  async getMySubscriptions(clientId: string) {
    const list = db.subscriptions.filter(s => s.client_id === clientId);
    return list.map(s => {
      const plan = db.plans.find(p => p.id === s.plan_id);
      const license = db.licenses.find(l => l.subscription_id === s.id);
      return { ...s, plan, license };
    });
  }

  async getSubscriptionById(id: string) {
    const subscription = db.subscriptions.find(s => s.id === id);
    if (!subscription) throw new Error('Subscription not found');

    const plan = db.plans.find(p => p.id === subscription.plan_id);
    const client = db.clients.find(c => c.id === subscription.client_id);
    const license = db.licenses.find(l => l.subscription_id === subscription.id);
    const payments = db.payments.filter(p => p.subscription_id === subscription.id);

    return {
      ...subscription,
      plan,
      client,
      license,
      payments
    };
  }

  async renewSubscription(subscriptionId: string) {
    const subscription = db.subscriptions.find(s => s.id === subscriptionId);
    if (!subscription) throw new Error('Subscription not found');

    const plan = db.plans.find(p => p.id === subscription.plan_id);
    if (!plan) throw new Error('Plan not found');

    const durationDays = plan.type === 'yearly' ? 365 : plan.type === 'half_yearly' ? 180 : 30;
    
    // Extend from current expiration date or now if already expired
    const baseDate = new Date(subscription.expires_at) > new Date() ? new Date(subscription.expires_at) : new Date();
    const newExpiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    subscription.expires_at = newExpiresAt;
    subscription.status = 'active';
    subscription.updated_at = new Date();

    const license = db.licenses.find(l => l.subscription_id === subscription.id);
    if (license && license.status === 'expired') {
      license.status = 'active';
    }

    const payment: Payment = {
      id: uuidv4(),
      subscription_id: subscription.id,
      stripe_payment_id: `ch_renew_${Date.now()}`,
      amount: plan.price,
      currency: plan.currency,
      status: 'completed',
      payment_method: 'auto_renew_card',
      description: `Renewal for ${plan.name} (${plan.type})`,
      created_at: new Date(),
      updated_at: new Date()
    };
    db.payments.push(payment);

    const client = db.clients.find(c => c.id === subscription.client_id);
    const user = client ? db.users.find(u => u.id === client.user_id) : null;
    if (user) {
      MailerService.sendSubscriptionRenewed(user.email, plan.name, newExpiresAt);
    }

    await db.createAuditLog({
      userId: user?.id,
      action: 'SUBSCRIPTION_RENEWED',
      resourceType: 'subscription',
      resourceId: subscription.id,
      changes: { newExpiresAt, amount: plan.price }
    });

    return {
      success: true,
      message: 'Subscription successfully renewed',
      expiresAt: newExpiresAt,
      subscription
    };
  }

  async cancelSubscription(id: string) {
    const subscription = db.subscriptions.find(s => s.id === id);
    if (!subscription) throw new Error('Subscription not found');

    subscription.status = 'cancelled';
    subscription.cancelled_at = new Date();
    subscription.auto_renew = false;
    subscription.updated_at = new Date();

    await db.createAuditLog({
      action: 'SUBSCRIPTION_CANCELLED',
      resourceType: 'subscription',
      resourceId: subscription.id
    });

    return { success: true, message: 'Subscription cancelled successfully' };
  }

  async toggleAutoRenew(id: string, autoRenew: boolean) {
    const subscription = db.subscriptions.find(s => s.id === id);
    if (!subscription) throw new Error('Subscription not found');

    subscription.auto_renew = autoRenew;
    subscription.updated_at = new Date();
    return subscription;
  }

  async getSubscriptionHistory(id: string) {
    const payments = db.payments.filter(p => p.subscription_id === id);
    const auditLogs = db.auditLogs.filter(a => a.resource_id === id);
    return { payments, auditLogs };
  }
}

export const subscriptionsService = new SubscriptionsService();
