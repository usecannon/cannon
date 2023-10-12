#!/usr/bin/env node

const { red } = require('chalk');
const cli = require('../dist/src');

cli
  .parseAsync()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    if (err.message && process.env.TRACE !== 'true') {
      console.error(red('Error: ' + err.message));
    } else {
      console.error(err);
    }
    process.exit(1);
  });
