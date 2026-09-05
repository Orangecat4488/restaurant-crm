import { Command } from 'commander';
import { registerActivateCommand } from './commands/activate';
import { registerStatusCommand } from './commands/status';
import { registerRenewCommand } from './commands/renew';
import { registerDeactivateCommand } from './commands/deactivate';
import { registerInfoCommand } from './commands/info';
import { registerLoginCommand } from './commands/login';
import { registerLogoutCommand } from './commands/logout';

const program = new Command();

program
  .name('crm-license')
  .description('Restaurant CRM Commercial Licensing CLI Tool')
  .version('1.0.0', '-v, --version', 'Output current CLI version')
  .option('-c, --config <file>', 'Use custom config file path')
  .option('--api <url>', 'Specify custom backend API URL')
  .option('--debug', 'Enable debug mode');

// Register all commands
registerActivateCommand(program);
registerStatusCommand(program);
registerRenewCommand(program);
registerDeactivateCommand(program);
registerInfoCommand(program);
registerLoginCommand(program);
registerLogoutCommand(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
