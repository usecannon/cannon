/* eslint-disable no-console */
import { createSpinner } from 'nanospinner';
export const spinner = createSpinner('Fetching...').start();

export const log = console.log.bind(console);
export const error = console.error.bind(console);
export const warn = console.warn.bind(console);
export const info = console.info.bind(console);

export const logSpinner = (...consoleText: any) => {
  spinner.stop();
  console.log(...consoleText);
  spinner.start();
  return;
};

export const warnSpinner = (...consoleText: any) => {
  spinner.stop();
  console.warn(...consoleText);
  spinner.start();
  return;
};

export const errorSpinner = (...consoleText: any) => {
  spinner.stop();
  console.error(...consoleText);
  spinner.start();
  return;
};

export const infoSpinner = (...consoleText: any) => {
  spinner.stop();
  console.info(...consoleText);
  spinner.start();
  return;
};

export const logSpinnerEnd = () => {
  spinner.stop();
};
