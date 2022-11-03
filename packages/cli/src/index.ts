import path from 'node:path';
import fs from 'node:fs/promises';
import { ethers } from 'ethers';
import { Command } from 'commander';
import { CannonWrapperGenericProvider, ChainBuilder, ContractArtifact, getAllDeploymentInfos, getPackageDir, getSavedPackagesDir } from '@usecannon/builder';

import { checkCannonVersion, execPromise, loadCannonfile, setupAnvil } from './helpers';
import { createSigners, parsePackageArguments, parsePackagesArguments, parseSettings } from './util/params';

import pkg from '../package.json';
import { PackageDefinition } from './types';
import {
  DEFAULT_CANNON_DIRECTORY,
  DEFAULT_REGISTRY_ADDRESS,
  DEFAULT_REGISTRY_ENDPOINT,
  DEFAULT_REGISTRY_IPFS_ENDPOINT,
} from './constants';
import { CannonRpcNode, runRpc } from './rpc';

export * from './types';
export * from './constants';
export * from './util/params';

import { RegistrationOptions as PublishRegistrationOptions } from './commands/publish';
import prompts from 'prompts';
import { interact } from './interact';
import { getContractsRecursive } from './util/contracts-recursive';

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
export { runRpc } from './rpc';

const program = new Command();

program
  .name('cannon')
  .version(pkg.version)
  .description('Run a cannon package on a local node')
  .enablePositionalOptions()
  .hook('preAction', async function () {
    await checkCannonVersion(pkg.version);
  });

configureRun(program);
configureRun(program.command('run'));

function configureRun(program: Command) {
  return program
    .description('Utility for instantly loading cannon packages in standalone contexts')
    .usage('[global options] ...[<name>[:<semver>] ...[<key>=<value>]]')
    .argument(
      '[packageNames...]',
      'List of packages to load, optionally with custom settings for each one',
      parsePackagesArguments
    )
    .option('-p --port <number>', 'Port which the JSON-RPC server will be exposed', '8545')
    .option('-f --fork <url>', 'Fork the network at the specified RPC url')
    .option('--logs', 'Show RPC logs instead of an interactive prompt')
    .option('--preset <name>', 'Load an alternate setting preset', 'main')
    .option('--write-deployments <path>', 'Path to write the deployments data (address and ABIs), like "./deployments"')
    .option('--project-directory [directory]', 'Path to a custom running environment directory')
    .option('-d --cannon-directory [directory]', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
    .option(
      '--registry-ipfs-url [https://something.com/ipfs/]',
      'URL of the JSON-RPC server used to query the registry',
      DEFAULT_REGISTRY_IPFS_ENDPOINT
    )
    .option(
      '--registry-ipfs-authorization-header [ipfsAuthorizationHeader]',
      'Authorization header for requests to the IPFS endpoint'
    )
    .option(
      '--registry-rpc-url [https://something.com/ipfs/]',
      'Network endpoint for interacting with the registry',
      DEFAULT_REGISTRY_ENDPOINT
    )
    .option('--registry-address [0xdeadbeef]', 'Address of the registry contract', DEFAULT_REGISTRY_ADDRESS)
    .option('--fund-addresses <fundAddresses...>', 'Pass a list of addresses to receive a balance of 10,000 ETH')
    .option(
      '--impersonate <address>',
      'Impersonate all calls from the given signer instead of a real wallet. Only works with --fork',
      '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
    )
    .option('--mnemonic <phrase>', 'Use the specified mnemonic to initialize a chain of signers while running')
    .option('--private-key <0xkey>', 'Use the specified private key hex to interact with the contracts')
    .action(async function (packages: PackageDefinition[], options, program) {
      const { run } = await import('./commands/run');

      const port = Number.parseInt(options.port) || 8545;

      let node: CannonRpcNode;
      if (options.fork) {
        const networkInfo = await new ethers.providers.JsonRpcProvider(options.fork).getNetwork();

        node = await runRpc({
          port,
          forkUrl: options.fork,
          chainId: networkInfo.chainId,
        });
      } else {
        node = await runRpc({ port });
      }

      if (options.projectDirectory) {
        options.projectDirectory = path.resolve(options.projectDirectory);
      }

      await run(packages, {
        ...options,
        node,
        helpInformation: program.helpInformation(),
      });
    });
}

program
  .command('build')
  .description('Build a package from a Cannonfile')
  .argument('[cannonfile]', 'Path to a cannonfile', 'cannonfile.toml')
  .argument('[settings...]', 'Custom settings for building the cannonfile')
  .option('-p --preset <preset>', 'The preset label for storing the build with the given settings', 'main')
  .option(
    '-c --contracts-directory [contracts]',
    'Contracts source directory which will be built using Foundry and saved to the path specified with --artifacts',
    './src'
  )
  .option('-a --artifacts-directory [artifacts]', 'Path to a directory with your artifact data', './out')
  .option('-d --cannon-directory [directory]', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .option(
    '--registry-ipfs-url [https://something.com/ipfs/]',
    'URL of the JSON-RPC server used to query the registry',
    DEFAULT_REGISTRY_IPFS_ENDPOINT
  )
  .option(
    '--registry-ipfs-authorization-header [ipfsAuthorizationHeader]',
    'Authorization header for requests to the IPFS endpoint'
  )
  .option(
    '--registry-rpc-url [https://something.com/ipfs/]',
    'Network endpoint for interacting with the registry',
    DEFAULT_REGISTRY_ENDPOINT
  )
  .option('--write-deployments <path>', 'Path to write the deployments data (address and ABIs), like "./deployments"')
  .option('--registry-address [0xdeadbeef]', 'Address of the registry contract', DEFAULT_REGISTRY_ADDRESS)
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
    const deploymentPath = opts.writeDeployments
      ? path.resolve(opts.writeDeployments)
      : path.resolve(projectDirectory, 'deployments');

    await setupAnvil();

    const node = await runRpc({
      port: 8545,
    });

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
    const { name, version } = loadCannonfile(cannonfilePath);

    await build({
      node,
      cannonfilePath,
      packageDefinition: {
        name,
        version,
        settings: parsedSettings,
      },
      getArtifact,
      cannonDirectory: opts.cannonDirectory,
      projectDirectory,
      preset: opts.preset,
      registryIpfsUrl: opts.registryIpfsUrl,
      registryIpfsAuthorizationHeader: opts.registryIpfsAuthorizationHeader,
      registryRpcUrl: opts.registryRpcUrl,
      registryAddress: opts.registryAddress,
      deploymentPath,
    });

    await node.kill();
  });

program
  .command('deploy')
  .description('Deploy a cannon package to a network')
  .argument('[packageWithSettings...]', 'Package to deploy, optionally with custom settings', parsePackageArguments)
  .requiredOption('-n --network-rpc <networkRpc>', 'URL of a JSON-RPC server to use for deployment')
  .requiredOption('-p --private-key <privateKey>', 'Private key of the wallet to use for deployment')
  .option('-p --preset [preset]', 'Load an alternate setting preset', 'main')
  .option('-d --cannon-directory [directory]', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .option('--write-deployments <path>', 'Path to write the deployments data (address and ABIs), like "./deployments"')
  .option('--prefix [prefix]', 'Specify a prefix to apply to the deployment artifact outputs')
  .option('--dry-run', 'Simulate this deployment process without deploying the contracts to the specified network')
  .option('--wipe', 'Delete old, and do not attempt to download any from the repository')
  .option(
    '--registry-ipfs-url [https://something.com/ipfs]',
    'URL of the JSON-RPC server used to query the registry',
    DEFAULT_REGISTRY_IPFS_ENDPOINT
  )
  .option(
    '--registry-ipfs-authorization-header [ipfsAuthorizationHeader]',
    'Authorization header for requests to the IPFS endpoint'
  )
  .option(
    '--registry-rpc-url [https://something.com/]',
    'Network endpoint for interacting with the registry',
    DEFAULT_REGISTRY_ENDPOINT
  )
  .option('--registry-address [0xdeadbeef]', 'Address of the registry contract', DEFAULT_REGISTRY_ADDRESS)
  .action(async function (packageDefinition, opts) {
    const { deploy } = await import('./commands/deploy');

    const projectDirectory = process.cwd();
    const deploymentPath = opts.writeDeployments
      ? path.resolve(opts.writeDeployments)
      : path.resolve(projectDirectory, 'deployments');

    const provider = new ethers.providers.JsonRpcProvider(opts.networkRpc);

    await deploy({
      packageDefinition,
      cannonDirectory: opts.directory,
      projectDirectory,
      provider,
      mnemonic: opts.mnemonic,
      privateKey: opts.privateKey,
      impersonate: opts.impersonate,
      preset: opts.preset,
      dryRun: opts.dryRun || false,
      wipe: opts.wipe || false,
      prefix: opts.prefix,
      deploymentPath,
      registryIpfsUrl: opts.registryIpfsUrl,
      registryIpfsAuthorizationHeader: opts.registryIpfsAuthorizationHeader,
      registryRpcUrl: opts.registryRpcUrl,
      registryAddress: opts.registryAddress,
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
  .option('-a --registryAddress <registryAddress>', 'Address for a custom package registry', DEFAULT_REGISTRY_ADDRESS)
  .option('-r --registryEndpoint <registryEndpoint>', 'Address for RPC endpoint for the registry', DEFAULT_REGISTRY_ENDPOINT)
  .option('-e --ipfsEndpoint <ipfsEndpoint>', 'Address for an IPFS endpoint')
  .option('-h --ipfsAuthorizationHeader <ipfsAuthorizationHeader>', 'Authorization header for requests to the IPFS endpoint')
  .action(async function (packageName, options) {
    const { publish } = await import('./commands/publish');

    let registrationOptions: PublishRegistrationOptions | undefined = undefined;

    if (options.registryEndpoint && options.privateKey) {
      const provider = new ethers.providers.JsonRpcProvider(options.registryEndpoint);
      const wallet = new ethers.Wallet(options.privateKey, provider);

      registrationOptions = {
        signer: wallet,
        registryAddress: options.registryAddress,
      };

      const response = await prompts({
        type: 'confirm',
        name: 'confirmation',
        message: `This will deploy your package to IPFS and use ${wallet.address} to add the package to the registry. (This will cost a small amount of gas.) Continue?`,
        initial: true,
      });

      if (!response.confirmation) {
        process.exit();
      }
    }

    await publish(
      options.directory,
      packageName,
      options.tags,
      options.ipfsEndpoint,
      options.ipfsAuthorizationHeader,
      registrationOptions
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

program
  .command('interact')
  .description('Start an interactive terminal against a set of active cannon deployments')
  .argument('<packageName>', 'Package to deploy, optionally with custom settings', parsePackageArguments)
  .option('-n --network <https://something.com/whatever>', 'URL to a JSONRPC endpoint to use for transactions')
  .option('-p --preset <preset>', 'Load an alternate setting preset', 'main')
  .option('--mnemonic <phrase>', 'Use the specified mnemonic to initialize a chain of signers while running')
  .option('--private-key <0xkey>', 'Use the specified private key hex to interact with the contracts')
  .action(async function (packageDefinition, opts) {
    const provider = new CannonWrapperGenericProvider({}, new ethers.providers.JsonRpcProvider(opts.network), false);
    const signers = createSigners(provider, opts);

    const networkInfo = await provider.getNetwork();

    const manifest = await getAllDeploymentInfos(
      getPackageDir(getSavedPackagesDir(), packageDefinition.name, packageDefinition.version)
    );

    const builder = new ChainBuilder({
      name: packageDefinition.name,
      version: packageDefinition.version,
      def: manifest.deploys[networkInfo.chainId.toString()][opts.preset].def || manifest.def,
      preset: opts.preset,

      readMode: 'metadata',
      writeMode: 'none',

      provider,
      chainId: networkInfo.chainId,
      savedPackagesDir: opts.cannonDirectory,
      getSigner: async () => signers[0],
    });

    const outputs = await builder.getOutputs();

    if (!outputs) {
      throw new Error(`no cannon build found for chain ${networkInfo.chainId}/${opts.preset}. Did you mean to run instead?`);
    }

    const contracts = [getContractsRecursive(outputs, signers[0])];

    provider.artifacts = outputs;

    await interact({
      packages: [packageDefinition],
      contracts,
      signer: signers[0],
      provider,
    });
  });

export default program;
