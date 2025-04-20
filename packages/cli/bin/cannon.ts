#!/usr/bin/env ts-node

import { red } from 'chalk';
import cli from '../src';

cli
  .parseAsync()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    if (err.message) {
      err.message = red(err.message);
    }

    //eslint-disable-next-line no-console
    console.error(err);

    process.exit(process.exitCode || 1);
  });
