import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;
  private logFile?: string;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setLogFile(path: string): void {
    this.logFile = path;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(chalk.blue(`[INFO] ${message}`), ...args);
    }
  }

  success(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.log(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }

  error(message: string, error?: Error | unknown): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(chalk.red(`[ERROR] ${message}`));
      if (error instanceof Error) {
        console.error(chalk.red(error.stack || error.message));
      } else if (error) {
        console.error(chalk.red(String(error)));
      }
    }
  }

  step(stepNumber: number, stepName: string): void {
    console.log(chalk.cyan.bold(`\n━━━ Step ${stepNumber}: ${stepName} ━━━`));
  }

  divider(): void {
    console.log(chalk.gray('─'.repeat(60)));
  }
}

export const logger = new Logger();
export default logger;
