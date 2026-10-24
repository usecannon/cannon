#!/usr/bin/env ts-node

import chalk from 'chalk';
import cli from '../src/index.js';

cli
  .parseAsync()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    if (err.message) {
      err.message = chalk.red(err.message);
    }

    //eslint-disable-next-line no-console
    console.error(err);

    process.exit(process.exitCode || 1);
  });
