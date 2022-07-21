#!/usr/bin/env node

import { Command } from 'commander';
export * as commands from './commands/build'; // TODO: Can we avoid putting this here?

import { checkCannonVersion } from './helpers';
import pkg from '../package.json';

import { resolve } from 'path';
import { ContractArtifact } from '@usecannon/builder';

const program = new Command();

program
  .name('cannon')
  .version(pkg.version)
  .description('Run a cannon package on a local node')
  .hook('preAction', async function () {
    await checkCannonVersion(pkg.version);
  });

configureRun(program);
configureRun(program.command('run'));

function configureRun(program: Command) {
  return program
    .description('Run a cannon package on a local node')
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

program
  .command('build')
  .description('Build a package from a Cannonfile')
  .usage('<cannonfile> <settings...>')
  .argument('<cannonfile>', 'Path to a cannonfile', 'cannonfile.toml')
  .argument('<settings...>')
  .option('-p --preset <preset>', 'Specify the preset label the given settings should be applied', 'main')
  .option('-a --artifacts <artifacts>', 'Specify the directory with your artifact data', './out')
  .action(async function (cannonfile, preset, settings, artifacts) {
    const { default: command } = await import('./commands/build');

    const getArtifact = async (name: string): Promise<ContractArtifact> => {
      const filepath = resolve(artifacts);
      // Loop over all folders in the artifacts folder
      // Look for a file name that matches the passed in parameter

      // Return as follows:
      // contractName: filename without extension (name parameter)
      // sourceName: foldername without extension
      // abi: abi object from the file
      // bytecode: bytecode.object from the file
      // linkReferences: bytecode.linkReferences from the file
    };

    await command(cannonfile, preset, settings, getArtifact);
  });

program
  .command('deploy')
  .description('Deploy a cannon package to a network')
  .argument('<package>', 'Label and version of the cannon package to deploy')
  .argument('<networkRpc>', '')
  .argument('<privateKey>', '')
  .option('--dry-run', '')
  .action(async function () {});

program
  .command('verify')
  .description('Verify a package on Etherscan')
  .option('<package>', 'Label and version of the cannon package to inspect')
  .action(async function () {});

program
  .command('packages')
  .description('List all packages in your cannon directory')
  .argument('<localCannonDirectory>', '~/.local/cannon')
  .action(async function () {});

program
  .command('inspect')
  .description('Inspect the details of a cannon package')
  .argument('<package>', 'Label and version of the cannon package to inspect')
  .action(async function () {});

program
  .command('publish')
  .description('Publish a cannon package to the registry')
  .option('<package>', 'Label and version of the cannon package to publish')
  .option('-t --tags <tags>', 'Comma separated list of labels for your package to be uploaded with.', 'latest')
  .option('-a --registryAddress <registryAddress>', 'Address for a custom package registry.')
  .action(async function () {});

if (require.main === module) {
  program.parse();
}

export default program;
