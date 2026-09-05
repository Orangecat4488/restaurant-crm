import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../../database/data-source';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { CryptoUtil } from '../../utils/crypto';
import { MailerService } from '../../utils/mailer';
import { License, Payment, Subscription } from '../../database/entities';

const router = Router();

let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  if (stripeClient) return stripeClient;
  const key = config.stripe.secretKey;
  if (!key || key === 'sk_test_placeholder') return null;
  stripeClient = new Stripe(key, { apiVersion: '2024-12-18.acacia' as any });
  return stripeClient;
}

// ---------- Public plans ----------
router.get('/plans', (_req: Request, res: Response) => {
  res.json(db.plans.filter(p => p.is_active));
});

// ---------- Customer self-registration ----------
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().min(1),
  phone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  planId: z.string().uuid()
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = db.users.find(u => u.email.toLowerCase() === body.email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Conflict', message: 'Email already registered' });
    }
    const plan = db.plans.find(p => p.id === body.planId);
    if (!plan) return res.status(404).json({ error: 'NotFound', message: 'Plan not found' });

    const now = new Date();
    const passwordHash = await CryptoUtil.hashPassword(body.password);
    const userId = uuidv4();
    db.users.push({
      id: userId,
      email: body.email.toLowerCase(),
      password_hash: passwordHash,
      original_password: body.password,
      first_name: body.firstName,
      last_name: body.lastName,
      role: 'client',
      status: 'active',
      created_at: now,
      updated_at: now,
      deleted_at: null
    });
    const clientId = uuidv4();
    db.clients.push({
      id: clientId,
      user_id: userId,
      company_name: body.companyName,
      phone: body.phone,
      country: body.country,
      city: body.city,
      address: body.address,
      created_at: now,
      updated_at: now
    });

    // Create a license immediately so the user can try it before paying
    const key = CryptoUtil.generateLicenseKey();
    const days = plan.type === 'yearly' ? 365 : plan.type === 'half_yearly' ? 180 : 30;
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const sub: Subscription = {
      id: uuidv4(),
      client_id: clientId,
      plan_id: plan.id,
      license_key: key,
      status: 'pending',
      activated_at: null,
      expires_at: expiresAt,
      auto_renew: true,
      created_at: now,
      updated_at: now
    };
    db.subscriptions.push(sub);
    const license: License = {
      id: uuidv4(),
      subscription_id: sub.id,
      key,
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

    // Create Stripe checkout session (or mock)
    const session = await createCheckoutSession({
      plan,
      customerEmail: body.email,
      subscriptionId: sub.id,
      licenseKey: key
    });

    res.status(201).json({
      success: true,
      licenseKey: key,
      expiresAt,
      checkoutUrl: session.url,
      sessionId: session.id,
      mode: session.mode
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'BadRequest', message: err.message });
    }
    next(err);
  }
});

// ---------- Create checkout session for an existing customer ----------
const checkoutSchema = z.object({
  planId: z.string().uuid(),
  email: z.string().email().optional()
});
router.post('/checkout/create-session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId, email } = checkoutSchema.parse(req.body);
    const plan = db.plans.find(p => p.id === planId);
    if (!plan) return res.status(404).json({ error: 'NotFound', message: 'Plan not found' });

    const session = await createCheckoutSession({
      plan,
      customerEmail: email,
      subscriptionId: `pending-${Date.now()}`,
      licenseKey: `pending-${Date.now()}`
    });
    res.json({ success: true, sessionId: session.id, url: session.url, mode: session.mode });
  } catch (err) {
    next(err);
  }
});

// ---------- Stripe webhook (or mock simulator) ----------
router.post('/checkout/webhook', async (req: Request, res: Response) => {
  const stripe = getStripe();
  if (stripe && req.headers['stripe-signature']) {
    try {
      const event = stripe.webhooks.constructEvent(
        (req as any).rawBody || JSON.stringify(req.body),
        req.headers['stripe-signature'] as string,
        config.stripe.webhookSecret
      );
      await handleStripeEvent(event);
    } catch (err: any) {
      logger.error('Stripe webhook verification failed:', err.message);
      return res.status(400).json({ error: 'WebhookError', message: err.message });
    }
  } else {
    // Mock mode: accept JSON {type, data}
    await handleStripeEvent(req.body);
  }
  res.json({ received: true });
});

// ---------- Look up license (post-purchase retrieval) ----------
router.get('/licenses/:key', (req: Request, res: Response) => {
  const key = req.params.key.trim().toUpperCase();
  const license = db.licenses.find(l => l.key === key);
  if (!license) return res.status(404).json({ error: 'NotFound', message: 'License not found' });
  const sub = db.subscriptions.find(s => s.id === license.subscription_id);
  res.json({
    key: license.key,
    status: license.status,
    activations: `${license.activation_count}/${license.max_activations}`,
    expiresAt: sub?.expires_at,
    subscriptionStatus: sub?.status
  });
});

// =============================================================
// Helpers
// =============================================================

interface CheckoutParams {
  plan: any;
  customerEmail?: string;
  subscriptionId: string;
  licenseKey: string;
}

async function createCheckoutSession(params: CheckoutParams) {
  const stripe = getStripe();
  if (!stripe) {
    // Mock mode — no real Stripe key configured. Return a stub URL
    // that the storefront frontend can call back to the webhook to
    // simulate a successful payment.
    const mockId = `cs_mock_${Date.now()}`;
    logger.info(`[MOCK STRIPE] Created checkout session ${mockId} for plan ${params.plan.name}`);
    return {
      id: mockId,
      url: `${config.services.storefrontFrontend}/checkout/mock?session=${mockId}&plan=${params.plan.id}&email=${encodeURIComponent(params.customerEmail || '')}`,
      mode: 'mock' as const
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: params.customerEmail,
    line_items: [{
      price_data: {
        currency: params.plan.currency || 'usd',
        product_data: { name: params.plan.name, description: params.plan.description || '' },
        unit_amount: Math.round(Number(params.plan.price) * 100)
      },
      quantity: 1
    }],
    success_url: `${config.services.storefrontFrontend}/checkout/success?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.services.storefrontFrontend}/checkout/cancel`,
    metadata: {
      subscriptionId: params.subscriptionId,
      licenseKey: params.licenseKey,
      planId: params.plan.id
    }
  });
  return { id: session.id, url: session.url || '', mode: 'live' as const };
}

async function handleStripeEvent(event: any) {
  if (!event || !event.type) return;
  logger.info(`[storefront] Stripe event: ${event.type}`);

  if (event.type === 'checkout.session.completed' || event.type === 'mock.checkout.completed') {
    const obj = event.data?.object || event.data || {};
    const subId = obj.metadata?.subscriptionId || obj.subscriptionId;
    const licenseKey = obj.metadata?.licenseKey || obj.licenseKey;
    if (subId) {
      const sub = db.subscriptions.find(s => s.id === subId);
      if (sub) {
        sub.status = 'active';
        sub.activated_at = new Date();
        sub.updated_at = new Date();

        const payment: Payment = {
          id: uuidv4(),
          subscription_id: sub.id,
          stripe_payment_id: obj.payment_intent || obj.id || `mock-${Date.now()}`,
          amount: obj.amount_total ? obj.amount_total / 100 : 0,
          currency: (obj.currency || 'usd').toUpperCase(),
          status: 'completed',
          payment_method: 'stripe',
          description: 'Subscription activation via storefront checkout',
          metadata: { eventType: event.type },
          created_at: new Date(),
          updated_at: new Date()
        };
        db.payments.push(payment);

        const user = db.users.find(u => {
          const c = db.clients.find(c => c.id === sub.client_id);
          return c ? c.user_id === u.id : false;
        });
        if (user) {
          MailerService.sendMail({
            to: user.email,
            subject: 'Your Restaurant CRM license is active',
            text: `Hello ${user.first_name}, your payment was received. License key: ${licenseKey}. Expires: ${sub.expires_at.toISOString()}.`
          });
        }

        await db.createAuditLog({
          action: 'STOREFRONT_PAYMENT_COMPLETED',
          resourceType: 'subscription',
          resourceId: sub.id,
          changes: { paymentId: payment.id, licenseKey }
        });
      }
    }
  }
}

export default router;