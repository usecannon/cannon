#!/usr/bin/env node

import cli from '../src/index';
import { red } from 'chalk';

cli
  .parseAsync()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    if (err.message) {
      console.error(red('Error: ' + err.message));
    } else {
      console.error(err);
    }
    process.exit(1);
  });
