#!/usr/bin/env node

import { Command } from 'commander';

import { checkCannonVersion, parseInteger, parsePackagesArguments } from './helpers';
import pkg from '../package.json';
import { PackageDefinition } from './types';

import type { RunOptions } from './commands/run';

// Can we avoid doing these exports here so only the necessary files are loaded when running a command?
export { build } from './commands/build';
export { deploy } from './commands/deploy';
export { exportPackage } from './commands/export';
export { importPackage } from './commands/import';
export { inspect } from './commands/inspect';
export { packages } from './commands/packages';
export { publish } from './commands/publish';
export { run } from './commands/run';
export { verify } from './commands/verify';

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
  return (
    program
      .description('Utility for instantly loading cannon packages in standalone contexts.')
      .usage('[global options] ...[<name>[:<semver>] ...[<key>=<value>]]')
      .argument(
        '[packages...]',
        'List of packages to load, optionally with custom settings for each one',
        parsePackagesArguments
      )
      .option('-h --host <name>', 'Host which the JSON-RPC server will be exposed')
      .option('-p --port <number>', 'Port which the JSON-RPC server will be exposed', parseInteger, 8545)
      .option('-f --fork <url>', 'Fork the network at the specified RPC url')
      .option('--file <path>', 'Path to the cannon.json file to startup locally')
      .option('--logs', 'Show RPC logs instead of interact prompt. If unspecified, defaults to an interactive terminal.')
      .option('--preset <name>', 'Load an alternate setting preset (default: main)', 'main')
      // .option('--write-deployments <path>', 'Path to write the deployments data (address and ABIs), like "./deployments"')
      // .option('-e --exit', 'Exit after building')
      .option('--registry-rpc <url>', 'URL to use for eth JSON-RPC endpoint', 'https://cloudflare-eth.com/v1/mainnet')
      .option(
        '--registry-address <address>',
        'Address where the cannon registry is deployed',
        '0xA98BE35415Dd28458DA4c1C034056766cbcaf642'
      )
      .option('--ipfs-url <https://...>', 'Host to pull IPFS resources from', 'https://usecannon.infura-ipfs.io')
      .action(async function (packages: PackageDefinition[], options: RunOptions, program: Command) {
        const { run } = await import('./commands/run');
        await run(packages, options, program);
      })
      .showHelpAfterError('Use --help for more information.')
  );
}

program
  .command('build')
  .description('Build a package from a Cannonfile')
  .argument('[cannonfile]', 'Path to a cannonfile', 'cannonfile.toml')
  .option('-p --preset <preset>', 'Specify the preset label the given settings should be applied', 'main')
  .option('-a --artifacts <artifacts>', 'Specify the directory with your artifact data', './out')
  .option('-d --directory [directory]', 'Path to a custom package directory', '~/.local/cannon')
  .argument('<settings...>')
  .action(async function (cannonfile, preset, artifacts, directory, settings) {
    // const getArtifact = async (name: string): Promise<ContractArtifact> => {
    //   return new Promise((resolve) => {
    //     resolve({ contractName: 'mock' } as ContractArtifact);
    //   });
    // };
    // Create option for baseProejctDir?

    // const getArtifact = async (name: string): Promise<ContractArtifact> => {
    //   // const filepath = resolve(artifacts);
    //   // Loop over all folders in the artifacts folder
    //   // Look for a file name that matches the passed in parameter
    //   // Return as follows:
    //   // contractName: filename without extension (name parameter)
    //   // sourceName: foldername without extension
    //   // abi: abi object from the file
    //   // bytecode: bytecode.object from the file
    //   // linkReferences: bytecode.linkReferences from the file
    // };
    // await command(cannonfile, preset, settings, getArtifact);

    const { build } = await import('./commands/build');
    // await build(cannonfile, preset, settings, getArtifact, directory);
  });

program
  .command('deploy')
  .description('Deploy a cannon package to a network')
  .argument('<packageName>', 'Name and version of the cannon package to deploy')
  .argument('<networkRpc>', '')
  .argument('<privateKey>', '')
  .option('-d --directory [directory]', 'Path to a custom package directory', '~/.local/cannon')
  .option('--dry-run', '')
  .action(async function (packageName, networkRpc, privateKey, directory) {
    const { deploy } = await import('./commands/deploy');
    await deploy(directory, packageName);
  });

program
  .command('verify')
  .description('Verify a package on Etherscan')
  .option('-a --apiKey <apiKey>', 'Etherscan API key')
  .action(async function (packageName, apiKey) {
    const { verify } = await import('./commands/verify');
    await verify(apiKey);
  });

program
  .command('packages')
  .description('List all packages in the local Cannon directory')
  .argument('[directory]', 'Path to a custom package directory', '~/.local/cannon')
  .action(async function (directory) {
    const { packages } = await import('./commands/packages');
    await packages(directory);
  });

program
  .command('inspect')
  .description('Inspect the details of a Cannon package')
  .argument('<packageName>', 'Name and version of the cannon package to inspect')
  .option('-d --directory [directory]', 'Path to a custom package directory', '~/.local/cannon')
  .option('-j --json', 'Output as JSON')
  .action(async function (packageName, options) {
    const { inspect } = await import('./commands/inspect');
    await inspect(options.directory, packageName, options.json);
  });

program
  .command('publish')
  .description('Publish a Cannon package to the registry')
  .argument('<packageName>', 'Name and version of the package to publish')
  .argument('<privateKey>', 'Private key of the wallet to use when publishing')
  .option('-d --directory [directory]', 'Path to a custom package directory', '~/.local/cannon')
  .option('-t --tags <tags>', 'Comma separated list of labels for your package', 'latest')
  .option(
    '-a --registryAddress <registryAddress>',
    'Address for a custom package registry',
    '0xA98BE35415Dd28458DA4c1C034056766cbcaf642'
  )
  .option(
    '-r --registryEndpoint <registryEndpoint>',
    'Address for RPC endpoint for the registry',
    'https://cloudflare-eth.com/v1/mainnet'
  )
  .option('-e --ipfsEndpoint <ipfsEndpoint>', 'Address for an IPFS endpoint')
  .option('-h --ipfsAuthorizationHeader <ipfsAuthorizationHeader>', 'Authorization header for requests to the IPFS endpoint')
  .action(async function (packageName, privateKey, options) {
    const { publish } = await import('./commands/publish');

    await publish(
      options.directory,
      privateKey,
      packageName,
      options.tags,
      options.registryAddress,
      options.registryEndpoint,
      options.ipfsEndpoint,
      options.ipfsAuthorizationHeader
    );
  });

program
  .command('import')
  .description('Import a Cannon package from a zip archive')
  .argument('<importFile>', 'Relative path and filename to package archive')
  .option('-d --directory [directory]', 'Path to a custom package directory', '~/.local/cannon')
  .action(async function (importFile, options) {
    const { importPackage } = await import('./commands/import');
    await importPackage(options.directory, importFile);
  });

program
  .command('export')
  .description('Export a Cannon package as a zip archive')
  .argument('<packageName>', 'Name and version of the cannon package to export')
  .argument('[outputFile]', 'Relative path and filename to export package archive')
  .option('-d --directory [directory]', 'Path to a custom package directory', '~/.local/cannon')
  .action(async function (packageName, outputFile, options) {
    const { exportPackage } = await import('./commands/export');
    await exportPackage(options.directory, outputFile, packageName);
  });

if (require.main === module) {
  program.parse();
}

export default program;
