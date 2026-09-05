import { Command } from 'commander';
import { LicenseService } from '../services/licenseService';
import { Logger } from '../utils/logger';

export function registerLogoutCommand(program: Command) {
  program
    .command('logout')
    .description('Log out and clear stored session token')
    .action(async () => {
      try {
        const globalOpts = program.opts();
        const service = new LicenseService(globalOpts.config, globalOpts.api);
        await service.logout();
        Logger.success('Successfully logged out.');
      } catch (err: any) {
        Logger.error(err.message);
      }
    });
}
