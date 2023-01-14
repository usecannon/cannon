import path from 'node:path';
import fs from 'node:fs/promises';
import { ethers } from 'ethers';
import { Command } from 'commander';
import {
  CannonWrapperGenericProvider,
  ChainDefinition,
  ContractArtifact,
  getOutputs,
  ChainBuilderRuntime,
  IPFSLoader,
} from '@usecannon/builder';

import { checkCannonVersion, execPromise, loadCannonfile, setupAnvil } from './helpers';
import { createSigners, parsePackageArguments, parsePackagesArguments, parseSettings } from './util/params';

import pkg from '../package.json';
import { PackageSpecification } from './types';
import { DEFAULT_REGISTRY_ADDRESS, DEFAULT_REGISTRY_ENDPOINT, DEFAULT_REGISTRY_IPFS_ENDPOINT } from './constants';
import { CannonRpcNode, getProvider, runRpc } from './rpc';

import './custom-steps/run';

export * from './types';
export * from './constants';
export * from './util/params';

import prompts from 'prompts';
import { interact } from './interact';
import { getContractsRecursive } from './util/contracts-recursive';
import { createDefaultReadRegistry } from './registry';
import { resolveCliSettings } from './settings';

// Can we avoid doing these exports here so only the necessary files are loaded when running a command?
export { build } from './commands/build';
export { inspect } from './commands/inspect';
export { packages } from './commands/packages';
export { publish } from './commands/publish';
export { run } from './commands/run';
export { verify } from './commands/verify';
export { runRpc } from './rpc';

export { createDefaultReadRegistry } from './registry';
export { resolveCliSettings } from './settings';
export { loadCannonfile } from './helpers';

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
      '<packageNames...>',
      'List of packages to load, optionally with custom settings for each one',
      parsePackagesArguments
    )
    .option('-p --port <number>', 'Port which the JSON-RPC server will be exposed', '8545')
    .option('-f --fork <url>', 'Fork the network at the specified RPC url')
    .option('--logs', 'Show RPC logs instead of an interactive prompt')
    .option('--preset <name>', 'Load an alternate setting preset', 'main')
    .option('--write-deployments <path>', 'Path to write the deployments data (address and ABIs), like "./deployments"')
    .option('--project-directory <directory>', 'Path to a custom running environment directory')
    .option(
      '--registry-ipfs-url <https://something.com/ipfs/>',
      'URL of the JSON-RPC server used to query the registry',
      DEFAULT_REGISTRY_IPFS_ENDPOINT
    )
    .option(
      '--registry-ipfs-authorization-header <ipfsAuthorizationHeader>',
      'Authorization header for requests to the IPFS endpoint'
    )
    .option(
      '--registry-rpc-url <https://something.com/ipfs/>',
      'Network endpoint for interacting with the registry',
      DEFAULT_REGISTRY_ENDPOINT
    )
    .option('--registry-address <0xdeadbeef>', 'Address of the registry contract', DEFAULT_REGISTRY_ADDRESS)
    .option('--fund-addresses <fundAddresses...>', 'Pass a list of addresses to receive a balance of 10,000 ETH')
    .option(
      '--impersonate <address>',
      'Impersonate all calls from the given signer instead of a real wallet. Only works with --fork',
      '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
    )
    .option('--mnemonic <phrase>', 'Use the specified mnemonic to initialize a chain of signers while running')
    .option('--private-key <0x...>', 'Use the specified private key hex to interact with the contracts')
    .action(async function (packages: PackageSpecification[], options, program) {
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
  .option(
    '--upgrade-from [cannon-package:0.0.1]',
    'Wipe the deployment files, and use the deployment files from another cannon package as base'
  )
  .option('-p --preset <preset>', 'The preset label for storing the build with the given settings', 'main')
  .option(
    '-c --contracts-directory [contracts]',
    'Contracts source directory which will be built using Foundry and saved to the path specified with --artifacts',
    './src'
  )
  .option('-a --artifacts-directory [artifacts]', 'Path to a directory with your artifact data', './out')
  .option(
    '--registry-ipfs-url <https://something.com/ipfs/>',
    'URL of the JSON-RPC server used to query the registry',
    DEFAULT_REGISTRY_IPFS_ENDPOINT
  )
  .option(
    '--registry-ipfs-authorization-header <ipfsAuthorizationHeader>',
    'Authorization header for requests to the IPFS endpoint'
  )
  .option(
    '--registry-rpc-url <https://something.com/ipfs/>',
    'Network endpoint for interacting with the registry',
    DEFAULT_REGISTRY_ENDPOINT
  )
  .option('--registry-address <0x...>', 'Address of the registry contract', DEFAULT_REGISTRY_ADDRESS)
  .option('--write-deployments <path>', 'Path to write the deployments data (address and ABIs), like "./deployments"')
  .option('--registry-address <0xdeadbeef>', 'Address of the registry contract', DEFAULT_REGISTRY_ADDRESS)
  .option('--wipe', 'Clear existing deployment state, start this deploy from scratch.')
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
    const { name, version } = await loadCannonfile(cannonfilePath);

    await build({
      provider: getProvider(node),
      cannonfilePath,
      packageDefinition: {
        name,
        version,
        settings: parsedSettings,
      },
      getArtifact,
      projectDirectory,
      upgradeFrom: opts.upgradeFrom,
      preset: opts.preset,
      deploymentPath,
      persist: opts.wipe,
    });

    await node.kill();
    // ensure the cli actually exits
    process.exit();
  });

program
  .command('verify')
  .description('Verify a package on Etherscan')
  .argument('<packageName>', 'Name and version of the Cannon package to verify')
  .option('-a --api-key <apiKey>', 'Etherscan API key')
  .option('-n --network <network>', 'Network of deployment to verify', 'mainnet')
  .action(async function (packageName, options) {
    const { verify } = await import('./commands/verify');
    await verify(packageName, options.apiKey, options.network);
  });

program
  .command('packages')
  .description('List all packages in the local Cannon directory')
  .action(async function () {
    const { packages } = await import('./commands/packages');
    await packages();
  });

program
  .command('inspect')
  .description('Inspect the details of a Cannon package')
  .argument('<packageName>', 'Name and version of the cannon package to inspect')
  .option('-j --json', 'Output as JSON')
  .action(async function (packageName, options) {
    const { inspect } = await import('./commands/inspect');
    await inspect(packageName, options.json);
  });

program
  .command('publish')
  .description('Publish a Cannon package to the registry')
  .argument('<packageName>', 'Name and version of the package to publish')
  .option('--preset <preset>', 'The preset of the packages that are deployed')
  .option('-p --private-key <privateKey>', 'Private key of the wallet to use when publishing')
  .option('-t --tags <tags>', 'Comma separated list of labels for your package', 'latest')
  .option('--gas-limit <gasLimit>', 'The maximum units of gas spent for the registration transaction')
  .option(
    '--max-fee-per-gas <maxFeePerGas>',
    'The maximum value (in gwei) for the base fee when submitting the registry transaction'
  )
  .option(
    '--max-priority-fee-per-gas <maxPriorityFeePerGas>',
    'The maximum value (in gwei) for the miner tip when submitting the registry transaction'
  )
  .option('-q --quiet', 'Only output final JSON object at the end, no human readable output')
  .option(
    '--registry-ipfs-url <https://...>',
    'URL of the JSON-RPC server used to query the registry',
    DEFAULT_REGISTRY_IPFS_ENDPOINT
  )
  .option(
    '--registry-ipfs-authorization-header <ipfsAuthorizationHeader>',
    'Authorization header for requests to the IPFS endpoint'
  )
  .option(
    '--registry-rpc-url <https://...>',
    'Network endpoint for interacting with the registry',
    DEFAULT_REGISTRY_ENDPOINT
  )
  .option('--registry-address <0x...>', 'Address of the registry contract', DEFAULT_REGISTRY_ADDRESS)
  .action(async function (packageName, options) {
    const { publish } = await import('./commands/publish');

    if (options.registryRpcUrl && options.privateKey) {
      const provider = new ethers.providers.JsonRpcProvider(options.registryRpcUrl);
      const wallet = new ethers.Wallet(options.privateKey, provider);

      const overrides: ethers.Overrides = {};

      if (options.maxFeePerGas) {
        overrides.maxFeePerGas = ethers.utils.parseUnits(options.maxFeePerGas, 'gwei');
      }

      if (options.maxPriorityFeePerGas) {
        overrides.maxPriorityFeePerGas = ethers.utils.parseUnits(options.maxPriorityFeePerGas, 'gwei');
      }

      if (options.gasLimit) {
        overrides.gasLimit = options.gasLimit;
      }

      if (!options.quiet) {
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

      await publish(packageName, options.tags, options.preset, wallet, overrides, options.quiet);
    } else {
      throw new Error('must specify private key and registry rpc');
    }
  });

program
  .command('interact')
  .description('Start an interactive terminal against a set of active cannon deployments')
  .argument('<packageName>', 'Package to deploy, optionally with custom settings', parsePackageArguments)
  .requiredOption('-n --network <https://something.com/whatever>', 'URL to a JSONRPC endpoint to use for transactions')
  .option('-p --preset <preset>', 'Load an alternate setting preset', 'main')
  .option('--mnemonic <phrase>', 'Use the specified mnemonic to initialize a chain of signers while running')
  .option('--private-key <0xkey>', 'Use the specified private key hex to interact with the contracts')
  .action(async function (packageDefinition, opts) {
    const provider = new CannonWrapperGenericProvider({}, new ethers.providers.JsonRpcProvider(opts.network), false);
    const signers = createSigners(provider, opts);

    const networkInfo = await provider.getNetwork();

    const resolver = createDefaultReadRegistry(resolveCliSettings());

    const runtime = new ChainBuilderRuntime(
      {
        provider,
        chainId: (await provider.getNetwork()).chainId,
        async getSigner(addr: string) {
          // on test network any user can be conjured
          await provider.send('hardhat_impersonateAccount', [addr]);
          await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
          return provider.getSigner(addr);
        },

        baseDir: null,
        snapshots: false,
      },
      new IPFSLoader(
        resolveCliSettings().ipfsUrl,
        resolver
      )
    );

    const deployData = await runtime.loader.readDeploy(
      `${packageDefinition.name}:${packageDefinition.version}`,
      opts.preset || 'main',
      runtime.chainId
    );

    if (!deployData) {
      throw new Error(
        `deployment not found: ${packageDefinition.name}:${packageDefinition.version}. please make sure it exists for the given preset and current network.`
      );
    }

    const outputs = await getOutputs(runtime, new ChainDefinition(deployData.def), deployData.state);

    if (!outputs) {
      throw new Error(`no cannon build found for chain ${networkInfo.chainId}/${opts.preset}. Did you mean to run instead?`);
    }

    const contracts = [getContractsRecursive(outputs, signers.length ? signers[0] : provider)];

    provider.artifacts = outputs;

    await interact({
      packages: [packageDefinition],
      contracts,
      signer: signers[0],
      provider,
    });
  });

export default program;
