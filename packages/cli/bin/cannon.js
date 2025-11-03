#!/usr/bin/env -S node --enable-source-maps --max-old-space-size=8192

import cli from '../dist/src/index.js';
import chalk from 'chalk';

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
