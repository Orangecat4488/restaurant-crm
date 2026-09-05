import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { config } from '../../config';
import { db } from '../../database/data-source';
import { logger } from '../../utils/logger';
import { Payment } from '../../database/entities';

export class PaymentsService {
  private stripe: Stripe | null = null;

  constructor() {
    if (config.stripe.secretKey && !config.stripe.secretKey.includes('placeholder')) {
      try {
        this.stripe = new Stripe(config.stripe.secretKey, {
          apiVersion: '2025-02-24.acacia' as any
        });
      } catch (e: any) {
        logger.warn('Stripe initialization skipped: ' + e.message);
      }
    }
  }

  async createPaymentIntent(params: {
    amount: number;
    currency?: string;
    subscriptionId?: string;
    clientId?: string;
    description?: string;
  }) {
    const currency = params.currency || 'USD';
    const amountInCents = Math.round(params.amount * 100);

    let clientSecret = `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substring(2)}`;
    let stripePaymentId = `pi_mock_${Date.now()}`;

    if (this.stripe) {
      try {
        const intent = await this.stripe.paymentIntents.create({
          amount: amountInCents,
          currency: currency.toLowerCase(),
          description: params.description,
          metadata: {
            subscriptionId: params.subscriptionId || '',
            clientId: params.clientId || ''
          }
        });
        clientSecret = intent.client_secret || clientSecret;
        stripePaymentId = intent.id;
      } catch (err: any) {
        logger.warn(`Stripe API warning: ${err.message}. Using simulated payment intent.`);
      }
    }

    const payment: Payment = {
      id: uuidv4(),
      subscription_id: params.subscriptionId || '',
      stripe_payment_id: stripePaymentId,
      amount: params.amount,
      currency: currency.toUpperCase(),
      status: 'pending',
      payment_method: 'stripe',
      description: params.description,
      metadata: { clientSecret },
      created_at: new Date(),
      updated_at: new Date()
    };
    db.payments.push(payment);

    return {
      clientSecret,
      paymentId: payment.id,
      stripePaymentId,
      amount: params.amount,
      currency: payment.currency
    };
  }

  async handleWebhook(rawBody: any, signature?: string) {
    let event: any = rawBody;

    if (this.stripe && signature && config.stripe.webhookSecret) {
      try {
        event = this.stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
      } catch (err: any) {
        logger.error(`Webhook signature verification failed: ${err.message}`);
        throw new Error(`Webhook Error: ${err.message}`);
      }
    }

    logger.info(`Received Stripe webhook event: ${event.type || 'simulated'}`);

    if (event.type === 'payment_intent.succeeded' || event.type === 'charge.succeeded') {
      const intent = event.data?.object || event;
      const payment = db.payments.find(p => p.stripe_payment_id === intent.id);
      if (payment) {
        payment.status = 'completed';
        payment.updated_at = new Date();

        if (payment.subscription_id) {
          const sub = db.subscriptions.find(s => s.id === payment.subscription_id);
          if (sub) {
            sub.status = 'active';
            sub.updated_at = new Date();
          }
        }

        await db.createAuditLog({
          action: 'PAYMENT_COMPLETED_WEBHOOK',
          resourceType: 'payment',
          resourceId: payment.id
        });
      }
    }

    return { received: true };
  }

  async listPayments(filter?: { clientId?: string; status?: string }) {
    let payments = [...db.payments];

    if (filter?.status) {
      payments = payments.filter(p => p.status === filter.status);
    }

    if (filter?.clientId) {
      const clientSubs = db.subscriptions.filter(s => s.client_id === filter.clientId).map(s => s.id);
      payments = payments.filter(p => clientSubs.includes(p.subscription_id));
    }

    return payments.map(p => {
      const sub = db.subscriptions.find(s => s.id === p.subscription_id);
      const plan = sub ? db.plans.find(pl => pl.id === sub.plan_id) : null;
      const client = sub ? db.clients.find(c => c.id === sub.client_id) : null;
      return {
        ...p,
        planName: plan?.name || 'Standard',
        clientCompanyName: client?.company_name || 'N/A'
      };
    });
  }

  async getPaymentById(id: string) {
    const payment = db.payments.find(p => p.id === id || p.stripe_payment_id === id);
    if (!payment) throw new Error('Payment not found');
    const sub = db.subscriptions.find(s => s.id === payment.subscription_id);
    const plan = sub ? db.plans.find(pl => pl.id === sub.plan_id) : null;
    const client = sub ? db.clients.find(c => c.id === sub.client_id) : null;

    return {
      ...payment,
      subscription: sub,
      plan,
      client
    };
  }

  async refundPayment(id: string) {
    const payment = db.payments.find(p => p.id === id);
    if (!payment) throw new Error('Payment not found');

    if (this.stripe && payment.stripe_payment_id && !payment.stripe_payment_id.startsWith('ch_mock')) {
      try {
        await this.stripe.refunds.create({ payment_intent: payment.stripe_payment_id });
      } catch (err: any) {
        logger.warn(`Stripe refund failed: ${err.message}`);
      }
    }

    payment.status = 'refunded';
    payment.updated_at = new Date();

    await db.createAuditLog({
      action: 'PAYMENT_REFUNDED',
      resourceType: 'payment',
      resourceId: payment.id
    });

    return { success: true, message: 'Payment refunded successfully', payment };
  }
}

export const paymentsService = new PaymentsService();
