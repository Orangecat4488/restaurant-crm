import { Command } from 'commander';
import { LicenseService } from '../services/licenseService';
import { Logger } from '../utils/logger';

export function registerStatusCommand(program: Command) {
  program
    .command('status')
    .description('Check the active license status')
    .action(async () => {
      try {
        const globalOpts = program.opts();
        const service = new LicenseService(globalOpts.config, globalOpts.api);

        const status = await service.getStatus();

        Logger.log('\n📋 Current License Status:');
        Logger.log(`Key:            \x1b[1m${status.key}\x1b[0m`);
        Logger.log(`Plan:           ${status.plan}`);
        Logger.log(`Status:         ${status.status}`);
        Logger.log(`Expires:        ${status.expires}`);
        Logger.log(`Days left:      \x1b[32m${status.daysLeft}\x1b[0m`);
        Logger.log(`Activations:    ${status.activations}`);
        Logger.log(`Last validated: ${status.lastValidated}\n`);
      } catch (err: any) {
        Logger.error(err.message);
        process.exit(1);
      }
    });
}
