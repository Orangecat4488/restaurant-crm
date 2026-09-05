import { Command } from 'commander';
import { LicenseService } from '../services/licenseService';
import { Logger } from '../utils/logger';

export function registerInfoCommand(program: Command) {
  program
    .command('info')
    .description('Show full registration details for this license')
    .action(async () => {
      try {
        const globalOpts = program.opts();
        const service = new LicenseService(globalOpts.config, globalOpts.api);

        const info = await service.getInfo();

        Logger.log('\nℹ️  License Information:');
        Logger.log(`Key:           \x1b[1m${info.key}\x1b[0m`);
        Logger.log(`Registered to: ${info.companyName}`);
        Logger.log(`Email:         ${info.email}`);
        Logger.log(`Plan:          ${info.plan}`);
        Logger.log(`Created:       ${info.created}`);
        Logger.log(`Expires:       ${info.expires}`);
        Logger.log(`Auto-renew:    ${info.autoRenew}`);
        Logger.log(`Activations:   ${info.activations}\n`);
      } catch (err: any) {
        Logger.error(err.message);
        process.exit(1);
      }
    });
}
