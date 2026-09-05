import { config } from './config';
import { logger } from './utils/logger';
import { bootstrapService } from './appFactory';

bootstrapService({
  name: 'restaurant-api',
  port: config.services.restaurantApi.port,
  mountLicenseGuard: true
}).catch(err => {
  logger.error('Failed to start restaurant-api:', err);
  process.exit(1);
});