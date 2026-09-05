import { config } from './config';
import { logger } from './utils/logger';
import { bootstrapService } from './appFactory';

bootstrapService({
  name: 'storefront-api',
  port: config.services.storefrontApi.port
}).catch(err => {
  logger.error('Failed to start storefront-api:', err);
  process.exit(1);
});