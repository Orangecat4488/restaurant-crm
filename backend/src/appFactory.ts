import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { logger } from './utils/logger';
import { db } from './database/data-source';
import { runSeed } from './database/seed';
import { rateLimiter } from './utils/rateLimiter';
import { errorHandler } from './middleware/errorHandler.middleware';
import { licenseGuard } from './middleware/licenseGuard.middleware';

import authRouter from './modules/auth/auth.routes';
import licensesRouter from './modules/licenses/licenses.routes';
import subscriptionsRouter from './modules/subscriptions/subscriptions.routes';
import paymentsRouter from './modules/payments/payments.routes';
import usersRouter from './modules/users/users.routes';
import adminRouter from './modules/admin/admin.routes';
import storefrontRouter from './modules/storefront/storefront.routes';

export type ServiceName = 'admin-api' | 'restaurant-api' | 'storefront-api';

export interface ServiceOptions {
  name: ServiceName;
  port: number;
  publicUrl?: string;
  corsOrigins?: string[];
  mountLicenseGuard?: boolean;
}

export function buildApp(options: ServiceOptions): Express {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'stripe-signature']
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(rateLimiter.getGeneralLimiter());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug(`[${options.name}] ${req.method} ${req.url}`);
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: options.name,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.get('/api/docs', (_req, res) => {
    res.json({
      title: `${options.name} API`,
      version: '1.0.0',
      endpoints: getEndpointsForService(options.name)
    });
  });

  // ---- per-service routing ----
  if (options.name === 'admin-api') {
    app.use('/api/auth', authRouter);
    app.use('/api/licenses', licensesRouter);
    app.use('/api/subscriptions', subscriptionsRouter);
    app.use('/api/payments', paymentsRouter);
    app.use('/api/users', usersRouter);
    app.use('/api/admin', adminRouter);
  } else if (options.name === 'restaurant-api') {
    // Restaurant CRM endpoints (license validation + employee data only).
    // Auth is shared with admin-api via the same JWT secret, so the same
    // login/refresh endpoints are also exposed here for convenience.
    app.use('/api/auth', authRouter);
    app.use('/api/licenses', licensesRouter);
    if (options.mountLicenseGuard) {
      // Apply license guard to all restaurant data routes
      app.use('/api/restaurant', licenseGuard, restaurantRouterPlaceholder());
    } else {
      app.use('/api/restaurant', restaurantRouterPlaceholder());
    }
  } else if (options.name === 'storefront-api') {
    // Public-facing storefront: plans, checkout, webhook. No admin endpoints.
    app.use('/api/auth', authRouter);
    app.use('/api/storefront', storefrontRouter);
  }

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'NotFound',
      service: options.name,
      message: `Endpoint ${req.method} ${req.originalUrl} does not exist on this service`
    });
  });

  app.use(errorHandler);
  return app;
}

function getEndpointsForService(name: ServiceName): string[] {
  if (name === 'admin-api') {
    return [
      'GET  /api/health',
      'POST /api/auth/login (body.deviceFingerprint)',
      'POST /api/auth/register',
      'GET  /api/auth/me',
      'POST /api/auth/refresh',
      'POST /api/auth/logout',
      'POST /api/licenses/:key/activate',
      'GET  /api/licenses/:key/validate',
      'GET  /api/licenses (admin)',
      'POST /api/licenses/generate (admin)',
      'PUT  /api/licenses/:id (admin)',
      'DELETE /api/licenses/:id (admin)',
      'GET  /api/admin/dashboard',
      'GET  /api/admin/clients',
      'POST /api/admin/clients/:id/reset-credentials',
      'POST /api/admin/clients/:id/unlock'
    ];
  }
  if (name === 'restaurant-api') {
    return [
      'GET  /api/health',
      'POST /api/auth/login (body.deviceFingerprint)',
      'POST /api/licenses/:key/activate',
      'GET  /api/licenses/:key/validate',
      'GET  /api/restaurant/* (license-gated)'
    ];
  }
  return [
    'GET  /api/health',
    'GET  /api/storefront/plans',
    'POST /api/storefront/checkout/create-session',
    'POST /api/storefront/checkout/webhook',
    'GET  /api/storefront/licenses/:key'
  ];
}

function restaurantRouterPlaceholder() {
  const router = require('express').Router();
  router.get('/menu', (_req: Request, res: Response) => res.json({ items: [], note: 'wire to your data source' }));
  router.get('/orders', (_req: Request, res: Response) => res.json({ items: [], note: 'wire to your data source' }));
  return router;
}

export async function bootstrapService(options: ServiceOptions) {
  await db.initialize();
  await runSeed();

  const app = buildApp(options);
  const server = app.listen(options.port, () => {
    logger.info('=======================================================');
    logger.info(`🚀 ${options.name} listening on http://localhost:${options.port}`);
    logger.info(`=======================================================`);
  });
  return server;
}