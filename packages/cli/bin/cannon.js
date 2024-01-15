#!/usr/bin/env node

const { red } = require('chalk');
const cli = require('../dist/src');
const { resolveCliSettings } = require('../dist/src/settings');

cli.default
  .parseAsync()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    const settings = resolveCliSettings();

    if (err.message && settings.trace) {
      err.message = red(err.message);
      console.error(err);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
