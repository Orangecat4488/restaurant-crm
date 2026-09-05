import { config } from './config';
import { logger } from './utils/logger';
import { bootstrapService } from './appFactory';

bootstrapService({
  name: 'admin-api',
  port: config.port
}).catch(err => {
  logger.error('Failed to start admin-api:', err);
  process.exit(1);
});
