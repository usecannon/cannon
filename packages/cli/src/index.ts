import path from 'node:path';
import { spawn } from 'child_process';
import { ethers } from 'ethers';
import { Command } from 'commander';
import {
  CannonWrapperGenericProvider,
  ChainDefinition,
  getOutputs,
  ChainBuilderRuntime,
  ChainArtifacts,
} from '@usecannon/builder';

import { checkCannonVersion, loadCannonfile } from './helpers';
import { parsePackageArguments, parsePackagesArguments, parseSettings } from './util/params';

import pkg from '../package.json';
import { PackageSpecification } from './types';
import { CannonRpcNode, getProvider, runRpc } from './rpc';

import './custom-steps/run';

export * from './types';
export * from './constants';
export * from './util/params';

import prompts from 'prompts';
import { interact } from './interact';
import { getContractsRecursive } from './util/contracts-recursive';
import { createDefaultReadRegistry, createDryRunRegistry } from './registry';
import { resolveCliSettings } from './settings';

import { installPlugin, removePlugin } from './plugins';
import Debug from 'debug';
import { writeModuleDeployments } from './util/write-deployments';
import { getIpfsLoader } from './util/loader';
import { getFoundryArtifact } from './foundry';
import { resolveProviderAndSigners } from './util/provider';

const debug = Debug('cannon:cli');

// Can we avoid doing these exports here so only the necessary files are loaded when running a command?
export { alter } from './commands/alter';
export { build } from './commands/build';
export { inspect } from './commands/inspect';
export { publish } from './commands/publish';
export { run } from './commands/run';
export { verify } from './commands/verify';
export { setup } from './commands/setup';
export { runRpc } from './rpc';

export { createDefaultReadRegistry, createDryRunRegistry } from './registry';
export { resolveProviderAndSigners } from './util/provider';
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
    .option('-n --provider-url [url]', 'RPC endpoint to fork off of')
    .option('-c --chain-id <number>', 'The chain id to run against')
    .option('--upgrade-from [cannon-package:0.0.1]', 'Specify a package to use as a new base for the deployment.')
    .option('--preset <name>', 'Load an alternate setting preset', 'main')
    .option('--logs', 'Show RPC logs instead of an interactive prompt')
    .option('--fund-addresses <fundAddresses...>', 'Pass a list of addresses to receive a balance of 10,000 ETH')
    .option(
      '--impersonate <address>',
      'Impersonate all calls from the given signer instead of a real wallet. Only works with --fork',
      '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
    )
    .option('--mnemonic <phrase>', 'Use the specified mnemonic to initialize a chain of signers while running')
    .option(
      '--private-key [key]',
      'Specify a comma separated list of private keys which may be needed to sign a transaction'
    )
    .action(async function (packages: PackageSpecification[], options, program) {
      const { run } = await import('./commands/run');

      const port = Number.parseInt(options.port) || 8545;

      let node: CannonRpcNode;
      if (options.chainId) {
        const { provider } = await resolveProviderAndSigners(resolveCliSettings(options), options.chainId);

        node = await runRpc({
          port,
          forkProvider: provider.passThroughProvider as ethers.providers.JsonRpcProvider,
          chainId: options.chainId,
        });
      } else {
        node = await runRpc({ port });
      }

      await run(packages, {
        ...options,
        node,
        helpInformation: program.helpInformation(),
      });
    });
}

async function doBuild(cannonfile: string, settings: string[], opts: any): Promise<[CannonRpcNode | null, ChainArtifacts]> {
  debug('do build called with', cannonfile, settings, opts);
  // If the first param is not a cannonfile, it should be parsed as settings
  if (!cannonfile.endsWith('.toml')) {
    settings.unshift(cannonfile);
    cannonfile = 'cannonfile.toml';
  }

  const parsedSettings = parseSettings(settings);

  const cannonfilePath = path.resolve(cannonfile);
  const projectDirectory = path.dirname(cannonfilePath);

  const cliSettings = resolveCliSettings(opts);

  let provider: CannonWrapperGenericProvider;
  let node: CannonRpcNode | null = null;

  let getSigner: ((s: string) => Promise<ethers.Signer>) | undefined = undefined;
  let getDefaultSigner: (() => Promise<ethers.Signer>) | undefined = undefined;

  if (!opts.chainId) {
    // doing a local build, just create a anvil rpc
    node = await runRpc({
      port: 8545,
    });

    provider = getProvider(node);
  } else {
    const p = await resolveProviderAndSigners(cliSettings, opts.chainId);

    if (opts.dryRun) {
      const chainId = (await p.provider.getNetwork()).chainId;

      node = await runRpc({
        port: 8545,
        forkProvider: p.provider.passThroughProvider as ethers.providers.JsonRpcProvider,
        chainId,
      });

      provider = getProvider(node);

      // need to set default signer to make sure it is accurate to the actual signer
      getDefaultSigner = async () => {
        const addr = await p.signers[0].getAddress();
        await provider.send('hardhat_impersonateAccount', [addr]);
        await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
        return provider.getSigner(addr);
      };
    } else {
      provider = p.provider;

      getSigner = async (s) => {
        for (const signer of p.signers) {
          if ((await signer.getAddress()) === s) {
            return signer;
          }
        }

        throw new Error(
          `signer not found for address ${s}. Please add the private key for this address to your command line.`
        );
      };

      getDefaultSigner = async () => p.signers[0];
    }
  }

  const { build } = await import('./commands/build');
  const { name, version } = await loadCannonfile(cannonfilePath);

  const { outputs } = await build({
    provider,
    cannonfilePath,
    packageDefinition: {
      name,
      version,
      settings: parsedSettings,
    },
    meta: {},
    getArtifact: getFoundryArtifact,
    getSigner,
    getDefaultSigner,
    projectDirectory,
    upgradeFrom: opts.upgradeFrom,
    preset: opts.preset,
    wipe: opts.wipe,
    persist: !opts.dryRun,
    overrideResolver: opts.dryRun ? createDryRunRegistry(cliSettings) : undefined,
    // TODO: foundry doesn't really have a way to specify whether the contract sources should be public or private
    publicSourceCode: true,
  });

  return [node, outputs];
}

program
  .command('build')
  .description('Build a package from a Cannonfile')
  .argument('[cannonfile]', 'Path to a cannonfile', 'cannonfile.toml')
  .argument('[settings...]', 'Custom settings for building the cannonfile')
  .option('-n --provider-url [url]', 'RPC endpoint to execute the deployment on')
  .option('-c --chain-id <number>', 'The chain id to run against')
  .option('-p --preset <preset>', 'The preset label for storing the build with the given settings', 'main')
  .option('--dry-run', 'Simulate building on a local fork rather than deploying on the real network')
  .option('--private-key [key]', 'Specify a comma separated list of private keys which may be needed to sign a transaction')
  .option('--wipe', 'Clear the existing deployment state and start this deploy from scratch.')
  .option('--upgrade-from [cannon-package:0.0.1]', 'Specify a package to use as a new base for the deployment.')
  .option(
    '-c --contracts-directory [contracts]',
    'Contracts source directory which will be built using Foundry and saved to the path specified with --artifacts',
    './src'
  )
  .option('-a --artifacts-directory [artifacts]', 'Path to a directory with your artifact data', './out')
  .showHelpAfterError('Use --help for more information.')
  .action(async (cannonfile, settings, opts) => {
    await spawn('forge', ['build']);

    const [node] = await doBuild(cannonfile, settings, opts);

    await node?.kill();
    // ensure the cli actually exits
    process.exit();
  });

program
  .command('verify')
  .description('Verify a package on Etherscan')
  .argument('<packageName>', 'Name and version of the Cannon package to verify')
  .option('-a --api-key <apiKey>', 'Etherscan API key')
  .option('-c --chain-id <chainId>', 'Chain ID of deployment to verify', '1')
  .option('-p --preset <preset>', 'Preset of the deployment to verify', 'main')
  .action(async function (packageName, options) {
    const { verify } = await import('./commands/verify');
    await verify(packageName, options.apiKey, options.preset, options.chainId);
    process.exit();
  });

program
  .command('alter')
  .description('Change a cannon package outside of the regular build process.')
  .argument('<packageName>', 'Name and version of the Cannon package to alter')
  .argument('<command>', 'Alteration command to execute. Current options: set-url, set-contract-address, mark-complete')
  .argument('[options...]', 'Additional options for your alteration command')
  .option('-c --chain-id <chainId>', 'Chain ID of deployment to alter')
  .option('-p --preset <preset>', 'Preset of the deployment to alter', 'main')
  .action(async function (packageName, command, options, flags) {
    const { alter } = await import('./commands/alter');
    // note: for command below, "meta" is empty because forge currently supplies no package meta
    await alter(packageName, flags.chainId, flags.preset, {}, command, options, {
      getArtifact: getFoundryArtifact,
    });
    process.exit();
  });

program
  .command('publish')
  .description('Publish a Cannon package to the registry')
  .argument('<packageName>', 'Name and version of the package to publish')
  .option('-n --registry-provider-url [url]', 'RPC endpoint to publish to')
  .option('--preset <preset>', 'The preset of the packages that are deployed', 'main')
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
  .option('-f --force', 'Push even if the artifact appaers to be pushed to the registry with that url')
  .action(async function (packageName, options) {
    const { publish } = await import('./commands/publish');

    const cliSettings = resolveCliSettings(options);
    const p = await resolveProviderAndSigners(cliSettings, parseInt(cliSettings.registryChainId));

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
        message: `This will deploy your package to IPFS and use ${await p.signers[0].getAddress()} to add the package to the registry. (This will cost a small amount of gas.) Continue?`,
        initial: true,
      });

      if (!response.confirmation) {
        process.exit();
      }
    }

    await publish(packageName, options.tags, options.preset, p.signers[0], overrides, options.quiet, options.force);
  });

program
  .command('inspect')
  .description('Inspect the details of a Cannon package')
  .argument('<packageName>', 'Name and version of the cannon package to inspect')
  .option('-c --chain-id <chainId>', 'Chain ID of the variant to inspect', '13370')
  .option('-p --preset <preset>', 'Preset of the variant to inspect', 'main')
  .option('-j --json', 'Output as JSON')
  .option(
    '-w --write-deployments <writeDeployments>',
    'Path to write the deployments data (address and ABIs), like "./deployments"'
  )
  .action(async function (packageName, options) {
    const { inspect } = await import('./commands/inspect');
    await inspect(packageName, options.chainId, options.preset, options.json, options.writeDeployments);
  });

program
  .command('test')
  .usage('[cannonfile] [-- forge options...]')
  .argument('[cannonfile]', 'Path to a cannonfile', 'cannonfile.toml')
  .argument('[forge options...]', 'Additional options to send to forge')
  .description('Run forge tests on a cannon deployment. To pass arguments through to `forge test`, use `--`.')
  .option('-n --provider-url [url]', 'RPC endpoint to fork off of')
  .option('-c --chain-id', 'Chain ID to connect to and run fork tests with')
  .option('-p --preset <preset>', 'The preset label for storing the build with the given settings', 'main')
  .option('--wipe', 'Clear the existing deployment state and start this deploy from scratch.')
  .option('--upgrade-from [cannon-package:0.0.1]', 'Specify a package to use as a new base for the deployment.')
  .action(async function (cannonfile, forgeOpts, opts) {
    const [node, outputs] = await doBuild(cannonfile, [], opts);

    // basically we need to write deployments here
    await writeModuleDeployments(path.join(process.cwd(), 'deployments/test'), '', outputs);

    // after the build is done we can run the forge tests for the user
    const forgeCmd = spawn('forge', ['test', '--fork-url', 'http://localhost:8545', ...forgeOpts]);

    forgeCmd.stdout.on('data', (data: Buffer) => {
      process.stdout.write(data);
    });

    forgeCmd.stderr.on('data', (data: Buffer) => {
      process.stderr.write(data);
    });

    forgeCmd.on('close', (code: number) => {
      console.log(`forge exited with code ${code}`);
      node?.kill();
      process.exit(code);
    });
  });

program
  .command('interact')
  .description('Start an interactive terminal against a set of active cannon deployments')
  .argument('<packageName>', 'Package to deploy, optionally with custom settings', parsePackageArguments)
  .requiredOption('-c --chain-id <chainId>', 'Chain ID of deployment to alter')
  .option('-n --provider-url [url]', 'RPC endpoint to execute the deployment on')
  .option('-p --preset <preset>', 'Load an alternate setting preset', 'main')
  .option('--mnemonic <phrase>', 'Use the specified mnemonic to initialize a chain of signers while running')
  .option('--private-key [key]', 'Specify a comma separated list of private keys which may be needed to sign a transaction')
  .action(async function (packageDefinition, opts) {
    const cliSettings = resolveCliSettings(opts);

    const p = await resolveProviderAndSigners(cliSettings, opts.chainId);

    const networkInfo = await p.provider.getNetwork();

    const resolver = await createDefaultReadRegistry(cliSettings);

    const runtime = new ChainBuilderRuntime(
      {
        provider: p.provider,
        chainId: networkInfo.chainId,
        async getSigner(addr: string) {
          // on test network any user can be conjured
          await p.provider.send('hardhat_impersonateAccount', [addr]);
          await p.provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
          return p.provider.getSigner(addr);
        },
        snapshots: false,
        allowPartialDeploy: false,
      },
      getIpfsLoader(cliSettings.ipfsUrl, resolver)
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

    const contracts = [getContractsRecursive(outputs, p.signers.length ? p.signers[0] : p.provider)];

    p.provider.artifacts = outputs;

    await interact({
      packages: [packageDefinition],
      contracts,
      signer: p.signers[0],
      provider: p.provider,
    });
  });

program
  .command('setup')
  .description('')
  .action(async function () {
    const { setup } = await import('./commands/setup');
    await setup();
  });

const pluginCmd = program.command('plugin').description('Manage Cannon plug-in modules');

pluginCmd
  .command('add')
  .argument('<name>', 'Name of an NPM package to add as a Cannon plug-in')
  .action(async function (name) {
    console.log(`Installing plugin ${name}...`);
    await installPlugin(name);
    console.log('Complete!');
  });

pluginCmd
  .command('remove')
  .argument('<name>', 'Name of an NPM package to remove as a Cannon plug-in')
  .action(async function (name) {
    console.log(`Removing plugin ${name}...`);
    await removePlugin(name);
    console.log('Complete!');
  });

export default program;
