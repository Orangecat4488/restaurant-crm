import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  logLevel: process.env.LOG_LEVEL || 'info',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/crm_restaurant'
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret-32-chars-long-crm!',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-32-chars-long-crm!',
    accessExpiration: parseInt(process.env.JWT_ACCESS_EXPIRATION || '900', 10), // 15 mins (sec)
    refreshExpiration: parseInt(process.env.JWT_REFRESH_EXPIRATION || '604800', 10) // 7 days (sec)
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
    publicKey: process.env.STRIPE_PUBLIC_KEY || 'pk_test_placeholder',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder'
  },

  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || 'noreply@crm-restaurant.com',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'CRM Restaurant Licensing <noreply@crm-restaurant.com>'
  },

  security: {
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10), // minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    bruteForceMaxAttempts: parseInt(process.env.BRUTE_FORCE_MAX_ATTEMPTS || '5', 10),
    bruteForceLockTime: parseInt(process.env.BRUTE_FORCE_LOCK_TIME || '1', 10), // minutes (60s)
    licenseEncryptionKey: (process.env.LICENSE_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef').padEnd(32, '0').slice(0, 32)
  },

  services: {
    adminApi: {
      port: parseInt(process.env.ADMIN_API_PORT || '5000', 10),
      publicUrl: process.env.ADMIN_API_URL || 'http://localhost:5000'
    },
    restaurantApi: {
      port: parseInt(process.env.RESTAURANT_API_PORT || '5001', 10),
      publicUrl: process.env.RESTAURANT_API_URL || 'http://localhost:5001'
    },
    storefrontApi: {
      port: parseInt(process.env.STOREFRONT_API_PORT || '5002', 10),
      publicUrl: process.env.STOREFRONT_API_URL || 'http://localhost:5002'
    },
    adminFrontend: process.env.ADMIN_FRONTEND_URL || 'http://localhost:5173',
    restaurantFrontend: process.env.RESTAURANT_FRONTEND_URL || 'http://localhost:5174',
    storefrontFrontend: process.env.STOREFRONT_FRONTEND_URL || 'http://localhost:5175'
  }
};
