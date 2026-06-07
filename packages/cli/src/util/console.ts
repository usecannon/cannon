/* eslint-disable no-console */
import { createSpinner } from 'nanospinner';
import { setBuilderLogger, type Logger } from '@usecannon/builder';

// Detect if we're in a test environment or non-TTY environment
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
const isTTY = process.stdout.isTTY;
const shouldUseSpinner = !isTestEnv && isTTY;

export const spinner = shouldUseSpinner ? createSpinner('Fetching...') : null;

// Initialize spinner if we should use it
if (spinner) {
  spinner.start();
}

// Add process cleanup handlers
const cleanupSpinner = () => {
  if (spinner) {
    spinner.stop();
  }
};

process.on('exit', cleanupSpinner);
process.on('SIGINT', () => {
  cleanupSpinner();
  process.exit();
});
process.on('SIGTERM', cleanupSpinner);

export const log = console.log.bind(console);
export const error = console.error.bind(console);
export const warn = console.warn.bind(console);
export const info = console.info.bind(console);

export const logSpinner = (...consoleText: any[]) => {
  try {
    if (spinner) {
      spinner.stop();
    }
    console.log(...consoleText);
    if (spinner) {
      spinner.start();
    }
  } catch (err) {
    // Fallback to regular console if spinner fails
    console.log(...consoleText);
  }
};

export const warnSpinner = (...consoleText: any[]) => {
  try {
    if (spinner) {
      spinner.stop();
    }
    console.warn(...consoleText);
    if (spinner) {
      spinner.start();
    }
  } catch (err) {
    // Fallback to regular console if spinner fails
    console.warn(...consoleText);
  }
};

export const errorSpinner = (...consoleText: any[]) => {
  try {
    if (spinner) {
      spinner.stop();
    }
    console.error(...consoleText);
    if (spinner) {
      spinner.start();
    }
  } catch (err) {
    // Fallback to regular console if spinner fails
    console.error(...consoleText);
  }
};

export const infoSpinner = (...consoleText: any[]) => {
  try {
    if (spinner) {
      spinner.stop();
    }
    console.info(...consoleText);
    if (spinner) {
      spinner.start();
    }
  } catch (err) {
    // Fallback to regular console if spinner fails
    console.info(...consoleText);
  }
};

export const logSpinnerStart = (text?: string) => {
  try {
    if (spinner) {
      spinner.start({ text: text ?? 'Fetching...' });
    }
  } catch (err) {
    // Ignore spinner errors on cleanup
  }
};

export const logSpinnerEnd = () => {
  try {
    if (spinner) {
      spinner.stop();
    }
  } catch (err) {
    // Ignore spinner errors on cleanup
  }
};

/**
 * Logger for builder package that coordinates with the CLI spinner
 */
export const builderLogger: Logger = {
  log: logSpinner,
  error: errorSpinner,
  warn: warnSpinner,
};

// Wire up the builder logger to coordinate with CLI spinner
setBuilderLogger(builderLogger);
