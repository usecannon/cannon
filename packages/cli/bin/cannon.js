#!/usr/bin / env node

const { red } = require('chalk');
const cli = require('../dist/src');

cli.default
  .parseAsync()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    if (err.message) {
      err.message = red(err.message);
    }

    //eslint-disable-next-line no-console
    console.error(err);

    process.exit(1);
  });
