import { Command } from 'commander';
import { LicenseService } from '../services/licenseService';
import { Logger } from '../utils/logger';

export function registerActivateCommand(program: Command) {
  program
    .command('activate <key>')
    .description('Activate a restaurant CRM license key on this machine')
    .action(async (key, cmdObj) => {
      try {
        const globalOpts = program.opts();
        const service = new LicenseService(globalOpts.config, globalOpts.api);

        Logger.log('⏳ Validating and activating license...');
        const res = await service.activate(key);

        Logger.success('License activated successfully!');
        Logger.log(`Plan: \x1b[1m${res.plan}\x1b[0m`);
        Logger.log(`Expires: \x1b[33m${res.expiresAt ? new Date(res.expiresAt).toISOString().split('T')[0] : 'Never'}\x1b[0m`);
        Logger.log(`Activations: \x1b[36m${res.activations}\x1b[0m`);
      } catch (err: any) {
        Logger.error(err.message);
        process.exit(1);
      }
    });
}
