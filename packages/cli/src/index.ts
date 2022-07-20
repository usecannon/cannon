#!/usr/bin/env node

import { Command } from 'commander';
import { red, bold } from 'chalk';

import { checkCannonVersion } from './helpers';
import pkg from '../package.json';

const program = new Command();

program
  .name('cannon')
  .version(pkg.version)
  .description('Utility for instantly loading cannon packages in standalone contexts.')
  .hook('preAction', async function () {
    await checkCannonVersion(pkg.version);
  });

configureRun(program);
configureRun(program.command('run'));

function configureRun(program: Command) {
  return program
    .description('Utility for instantly loading cannon packages in standalone contexts.')
    .usage('[global options] <name>:<semver> [key=value]')
    .argument('<package>', 'Label and version of the cannon package to load')
    .argument('[settings...]', 'Arguments used to modify the given package')
    .option('-h --host <name>', 'Host which the JSON-RPC server will be exposed')
    .option('-p --port <number>', 'Port which the JSON-RPC server will be exposed')
    .option('-f --fork <url>', 'Fork the network at the specified RPC url')
    .option('--logs', 'Show RPC logs instead of interact prompt. If unspecified, defaults to an interactive terminal.')
    .option('--preset <name>', 'Load an alternate setting preset (default: main)')
    .option('--write-deployments <path>', 'Path to write the deployments data (address and ABIs), like "./deployments"')
    .option('-e --exit', 'Exit after building')
    .option('--registry-rpc <url>', 'URL to use for eth JSON-RPC endpoint', 'https://cloudflare-eth.com/v1/mainnet')
    .option(
      '--registry-address <address>',
      'Address where the cannon registry is deployed',
      '0xA98BE35415Dd28458DA4c1C034056766cbcaf642'
    )
    .option('--ipfs-url <https://...>', 'Host to pull IPFS resources from', 'https://usecannon.infura-ipfs.io')
    .action(async function (packageName, settings, options, program) {
      const { default: command } = await import('./commands/run');
      await command(packageName, settings, options, program);
    });
}

if (require.main === module) {
  program.parse();
}

export default program;
