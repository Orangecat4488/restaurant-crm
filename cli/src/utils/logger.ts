export class Logger {
  static success(msg: string) {
    console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
  }

  static error(msg: string) {
    console.error(`\x1b[31m❌ Error: ${msg}\x1b[0m`);
  }

  static warn(msg: string) {
    console.warn(`\x1b[33m⚠️  Warning: ${msg}\x1b[0m`);
  }

  static info(msg: string) {
    console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`);
  }

  static title(msg: string) {
    console.log(`\n\x1b[1m\x1b[35m=== ${msg} ===\x1b[0m\n`);
  }

  static log(msg: string) {
    console.log(msg);
  }
}
