import { select, input, confirm, checkbox } from '@inquirer/prompts';

export async function promptSelect<T extends string>(
  message: string,
  choices: Array<{ value: T; name: string; description?: string }>
): Promise<T> {
  return await select({
    message,
    choices,
  });
}

export async function promptInput(
  message: string,
  defaultValue?: string,
  validate?: (value: string) => boolean | string | Promise<boolean | string>
): Promise<string> {
  return await input({
    message,
    default: defaultValue,
    validate: validate || ((value) => value.length > 0 || 'This field is required'),
  });
}

export async function promptConfirm(
  message: string,
  defaultValue: boolean = false
): Promise<boolean> {
  return await confirm({
    message,
    default: defaultValue,
  });
}

export async function promptCheckbox<T extends string>(
  message: string,
  choices: Array<{ value: T; name: string; checked?: boolean }>
): Promise<T[]> {
  return await checkbox({
    message,
    choices,
  });
}

export async function promptMultilineInput(
  message: string,
  hint: string = 'Press Enter for new line, Ctrl+D when done'
): Promise<string> {
  console.log(message);
  console.log(chalk.gray(hint));

  const lines: string[] = [];
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.on('line', (line) => {
      lines.push(line);
    });

    rl.on('close', () => {
      resolve(lines.join('\n'));
    });
  });
}

import chalk from 'chalk';
import * as readline from 'readline';

export function displayOptions<T extends string>(
  options: Array<{ value: T; label: string; description?: string }>
): void {
  console.log('');
  options.forEach((option, index) => {
    console.log(chalk.bold(`${index + 1}. ${option.label}`));
    if (option.description) {
      console.log(chalk.gray(`   ${option.description}`));
    }
  });
  console.log('');
}
