export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? (typeof meta === 'object' ? ` ${JSON.stringify(meta)}` : ` ${meta}`) : '';
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr}`;
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug') {
      console.debug(`\x1b[36m${this.formatMessage('debug', message, meta)}\x1b[0m`);
    }
  }

  info(message: string, meta?: any): void {
    console.info(`\x1b[32m${this.formatMessage('info', message, meta)}\x1b[0m`);
  }

  warn(message: string, meta?: any): void {
    console.warn(`\x1b[33m${this.formatMessage('warn', message, meta)}\x1b[0m`);
  }

  error(message: string, meta?: any): void {
    console.error(`\x1b[31m${this.formatMessage('error', message, meta)}\x1b[0m`);
  }
}

export const logger = new Logger();
