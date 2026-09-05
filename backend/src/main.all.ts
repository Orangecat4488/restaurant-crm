import { config } from './config';
import { logger } from './utils/logger';
import { bootstrapService } from './appFactory';

/**
 * Dev launcher: starts all three backend services in the same process.
 * In production each one should run as its own process via the
 * dedicated entry points:
 *   - main.admin.ts
 *   - main.restaurant.ts
 *   - main.storefront.ts
 */
async function startAll() {
  const services = [
    { name: 'admin-api' as const, port: config.services.adminApi.port, mountLicenseGuard: false },
    { name: 'restaurant-api' as const, port: config.services.restaurantApi.port, mountLicenseGuard: true },
    { name: 'storefront-api' as const, port: config.services.storefrontApi.port, mountLicenseGuard: false }
  ];

  for (const svc of services) {
    try {
      await bootstrapService(svc);
    } catch (err: any) {
      logger.error(`Failed to start ${svc.name}: ${err.message}`);
      process.exit(1);
    }
  }
}

startAll();