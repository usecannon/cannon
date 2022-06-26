import { Command } from 'commander';

import Builder from '@usecannon/builder';

import pkg from '../package.json';

const program = new Command();

program
  .name('cannon')
  .version(pkg.version)
  .description('Utility for instantly loading cannon charts in standalone contexts')
  .usage('');

async function run() {
  program.parse();
}

run();
