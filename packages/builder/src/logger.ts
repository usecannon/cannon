/**
 * Logger interface for builder package
 * Allows CLI to pass in spinner-aware logging functions
 */
export interface Logger {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
}

/**
 * Default console logger (used when no custom logger is provided)
 */
export const defaultLogger: Logger = {
  // eslint-disable-next-line no-console
  log: console.log.bind(console),
  // eslint-disable-next-line no-console
  error: console.error.bind(console),
  // eslint-disable-next-line no-console
  warn: console.warn.bind(console),
};

// Module-level logger that can be set by CLI to coordinate with spinner
let _logger: Logger = defaultLogger;

/**
 * Set the logger for the builder package.
 * This should be called by the CLI at startup to provide a spinner-aware logger.
 */
export function setBuilderLogger(newLogger: Logger) {
  _logger = newLogger;
}

/**
 * Get the current builder logger instance.
 */
export function getBuilderLogger(): Logger {
  return _logger;
}
