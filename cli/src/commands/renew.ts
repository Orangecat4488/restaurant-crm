import { Command } from 'commander';
import { LicenseService } from '../services/licenseService';
import { Logger } from '../utils/logger';

export function registerRenewCommand(program: Command) {
  program
    .command('renew')
    .description('Renew existing subscription and update license validity')
    .action(async () => {
      try {
        const globalOpts = program.opts();
        const service = new LicenseService(globalOpts.config, globalOpts.api);

        Logger.log('💳 Opening payment renewal pipeline...');
        const res = await service.renew();

        Logger.success('Payment successful!');
        Logger.log(`New expiration date: \x1b[32m${res.expiresAt ? new Date(res.expiresAt).toISOString().split('T')[0] : 'N/A'}\x1b[0m`);
      } catch (err: any) {
        Logger.error(err.message);
        process.exit(1);
      }
    });
}
