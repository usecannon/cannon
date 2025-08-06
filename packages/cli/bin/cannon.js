#!/usr/bin/env -S node --enable-source-maps

const { red } = require('chalk');
const cli = require('../dist/src');

cli.default
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
