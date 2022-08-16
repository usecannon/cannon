import path from 'node:path';
import fs from 'node:fs/promises';
import _ from 'lodash';
import { Command } from 'commander';

import { checkCannonVersion, execPromise } from './helpers';
import { parsePackageArguments, parsePackagesArguments, parseSettings } from './util/params';
import pkg from '../package.json';
import { PackageDefinition } from './types';

import { ContractArtifact } from '@usecannon/builder';
import { DEFAULT_CANNON_DIRECTORY } from './constants';

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
  return program
    .description('Utility for instantly loading cannon packages in standalone contexts.')
    .usage('[global options] ...[<name>[:<semver>] ...[<key>=<value>]]')
    .argument(
      '[packageNames...]',
      'List of packages to load, optionally with custom settings for each one',
      parsePackagesArguments
    )
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
    .action(async function (packages: PackageDefinition[], options, program) {
      const { run } = await import('./commands/run');
      await run(packages, options, program);
    });
}

program
  .command('build')
  .description('Build a package from a Cannonfile')
  .argument('[cannonfile]', 'Path to a cannonfile', 'cannonfile.toml')
  .argument('[settings...]', 'Custom settings to to build the cannon image')
  .option('-p --preset <preset>', 'Specify the preset label the given settings should be applied', 'main')
  .option(
    '-c --contracts [contracts]',
    'Contracts sources directory, these will be built using Foundry and saved to --artifacts.'
  )
  .option('-a --artifacts [artifacts]', 'Specify the directory with your artifact data.')
  .option('-d --directory [directory]', 'Path to a custom package directory.', DEFAULT_CANNON_DIRECTORY)
  .option('--ipfs-url <https://...>', 'Host to pull IPFS resources from', 'https://usecannon.infura-ipfs.io')
  .showHelpAfterError('Use --help for more information.')
  .action(async function (cannonfile, settings, opts) {
    // If the first param is not a cannonfile, it should be parsed as settings
    if (!cannonfile.endsWith('.toml')) {
      settings.unshift(cannonfile);
      cannonfile = 'cannonfile.toml';
    }

    const parsedSettings = parseSettings(settings);

    const cannonfilePath = path.resolve(cannonfile);
    const projectDirectory = path.dirname(cannonfilePath);

    // Build project to get the artifacts
    const contractsPath = opts.contracts ? path.resolve(opts.contracts) : path.join(projectDirectory, 'src');
    const artifactsPath = opts.artifacts ? path.resolve(opts.artifacts) : path.join(projectDirectory, 'out');
    await execPromise(`forge build -c ${contractsPath} -o ${artifactsPath}`);

    const getArtifact = async (name: string): Promise<ContractArtifact> => {
      // TODO: Theres a bug that if the file has a different name than the contract it would not work
      const artifactPath = path.join(artifactsPath, `${name}.sol`, `${name}.json`);
      const artifactBuffer = await fs.readFile(artifactPath);
      const artifact = JSON.parse(artifactBuffer.toString()) as any;
      return {
        contractName: name,
        sourceName: artifact.ast.absolutePath,
        abi: artifact.abi,
        bytecode: artifact.bytecode.object,
        linkReferences: artifact.bytecode.linkReferences,
      };
    };

    const { build } = await import('./commands/build');
    await build({
      cannonfilePath,
      settings: parsedSettings,
      getArtifact,
      cannonDirectory: opts.directory,
      projectDirectory,
      preset: opts.preset,
    });
  });

program
  .command('deploy')
  .description('Deploy a cannon package to a network')
  .argument('[package...]', 'Cannon Package to use, optionally with custom settings', parsePackageArguments)
  .requiredOption('-n --network-rpc <networkRpc>', 'RPC network endpoint url to deploy to')
  .requiredOption('-p --private-key <privateKey>', 'Private key of the wallet to use when deploying')
  .option('-p --preset [preset]', 'Specify the preset of settings to be used from the cannon package', 'main')
  .option('-d --directory [directory]', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .option('--prefix [prefix]', 'Specify the preset of settings to be used from the cannon package', 'main')
  .option('--out [out]', 'Path to a custom directory where to save deployment artifacts')
  .option('--dry-run')
  .action(async function (packageDefinition, opts) {
    const { deploy } = await import('./commands/deploy');

    // TODO Add a private key format validator for better error messages

    const projectDirectory = process.cwd();
    const deploymentPath = opts.out ? path.resolve(opts.out) : path.resolve(projectDirectory, 'deployments');

    await deploy({
      packageDefinition,
      cannonDirectory: opts.directory,
      projectDirectory,
      networkRpc: opts.networkRpc,
      privateKey: opts.privateKey,
      preset: opts.preset,
      dryRun: opts.dryRun || false,
      prefix: opts.prefix,
      deploymentPath,
    });
  });

program
  .command('verify')
  .description('Verify a package on Etherscan')
  .argument('<packageName>', 'Name and version of the Cannon package to verify')
  .option('-a --apiKey <apiKey>', 'Etherscan API key')
  .option('-n --network <network>', 'Network of deployment to verify', 'mainnet')
  .option('-d --directory [directory]', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .action(async function (packageName, options) {
    const { verify } = await import('./commands/verify');
    await verify(packageName, options.apiKey, options.network, options.directory);
  });

program
  .command('packages')
  .description('List all packages in the local Cannon directory')
  .argument('[directory]', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .action(async function (directory) {
    const { packages } = await import('./commands/packages');
    await packages(directory);
  });

program
  .command('inspect')
  .description('Inspect the details of a Cannon package')
  .argument('<packageName>', 'Name and version of the cannon package to inspect')
  .option('-d --directory [directory]', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .option('-j --json', 'Output as JSON')
  .action(async function (packageName, options) {
    const { inspect } = await import('./commands/inspect');
    await inspect(options.directory, packageName, options.json);
  });

program
  .command('publish')
  .description('Publish a Cannon package to the registry')
  .argument('<packageName>', 'Name and version of the package to publish')
  .option('-p <privateKey>', 'Private key of the wallet to use when publishing')
  .option('-d --directory [directory]', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
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
  .action(async function (packageName, options) {
    const { publish } = await import('./commands/publish');

    await publish(
      options.directory,
      options.privateKey,
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
  .option('-d --directory [directory]', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .action(async function (importFile, options) {
    const { importPackage } = await import('./commands/import');
    await importPackage(options.directory, importFile);
  });

program
  .command('export')
  .description('Export a Cannon package as a zip archive')
  .argument('<packageName>', 'Name and version of the cannon package to export')
  .argument('[outputFile]', 'Relative path and filename to export package archive')
  .option('-d --directory [directory]', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .action(async function (packageName, outputFile, options) {
    const { exportPackage } = await import('./commands/export');
    await exportPackage(options.directory, outputFile, packageName);
  });

export default program;
