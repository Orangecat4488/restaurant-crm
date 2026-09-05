import { Command } from 'commander';
import readline from 'readline';
import { LicenseService } from '../services/licenseService';
import { Logger } from '../utils/logger';

export function registerLoginCommand(program: Command) {
  program
    .command('login')
    .description('Authenticate with CRM account')
    .action(async () => {
      try {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const email = await new Promise<string>(resolve => rl.question('Email: ', ans => resolve(ans.trim())));
        const password = await new Promise<string>(resolve => rl.question('Password: ', ans => {
          rl.close();
          resolve(ans);
        }));

        const globalOpts = program.opts();
        const service = new LicenseService(globalOpts.config, globalOpts.api);

        Logger.log('Authenticating...');
        const res = await service.login(email, password);
        Logger.success(`Successfully logged in as ${res.user.email} (${res.user.role})`);
      } catch (err: any) {
        Logger.error(err.message);
        process.exit(1);
      }
    });
}
