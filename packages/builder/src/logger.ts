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
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
};
