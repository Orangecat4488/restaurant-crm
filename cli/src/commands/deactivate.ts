import { Command } from 'commander';
import readline from 'readline';
import { LicenseService } from '../services/licenseService';
import { Logger } from '../utils/logger';

export function registerDeactivateCommand(program: Command) {
  program
    .command('deactivate')
    .option('-y, --yes', 'Skip confirmation prompt')
    .description('Deactivate and remove the license from this device')
    .action(async (options) => {
      try {
        const globalOpts = program.opts();
        const service = new LicenseService(globalOpts.config, globalOpts.api);

        if (!options.yes) {
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          const answer = await new Promise<string>(resolve => {
            rl.question('⚠️  Are you sure you want to deactivate this license? (y/N): ', ans => {
              rl.close();
              resolve(ans.trim().toLowerCase());
            });
          });

          if (answer !== 'y' && answer !== 'yes') {
            Logger.log('Operation cancelled.');
            return;
          }
        }

        await service.deactivate();
        Logger.success('License deactivated. Local credentials removed and activation slot released on the server.');
      } catch (err: any) {
        Logger.error(err.message);
        process.exit(1);
      }
    });
}
