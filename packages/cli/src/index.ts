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
  CannonStorage,
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

import { interact } from './commands/interact';
import { getContractsRecursive } from './util/contracts-recursive';
import { createDefaultReadRegistry, createDryRunRegistry } from './registry';
import { resolveCliSettings } from './settings';

import { installPlugin, removePlugin } from './plugins';
import Debug from 'debug';
import { writeModuleDeployments } from './util/write-deployments';
import { getFoundryArtifact } from './foundry';
import { resolveRegistryProvider, resolveWriteProvider } from './util/provider';
import { getMainLoader } from './loader';
import { bold, green, red, yellow } from 'chalk';

const debug = Debug('cannon:cli');

// Can we avoid doing these exports here so only the necessary files are loaded when running a command?
export { ChainDefinition, DeploymentInfo } from '@usecannon/builder';
export { alter } from './commands/alter';
export { build } from './commands/build';
export { clean } from './commands/clean';
export { inspect } from './commands/inspect';
export { publish } from './commands/publish';
export { run } from './commands/run';
export { verify } from './commands/verify';
export { setup } from './commands/setup';
export { runRpc, getProvider } from './rpc';

export { createDefaultReadRegistry, createDryRunRegistry } from './registry';
export { resolveProviderAndSigners } from './util/provider';
export { resolveCliSettings } from './settings';
export { getFoundryArtifact } from './foundry';
export { loadCannonfile } from './helpers';

import { listInstalledPlugins } from './plugins';
import prompts from 'prompts';
import { addAnvilOptions, pickAnvilOptions } from './util/anvil';

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
  return addAnvilOptions(program)
    .description('Utility for instantly loading cannon packages in standalone contexts')
    .usage('[global options] ...[<name>[:<semver>] ...[<key>=<value>]]')
    .argument(
      '<packageNames...>',
      'List of packages to load, optionally with custom settings for each one',
      parsePackagesArguments
    )
    .option('-n --provider-url [url]', 'RPC endpoint to fork off of')
    .option('--build', 'Specify to rebuild generated artifacts with latest, even if no changed settings have been defined.')
    .option('--upgrade-from [cannon-package:0.0.1]', 'Specify a package to use as a new base for the deployment.')
    .option('--registry-priority <registry>', 'Change the default registry to read from first. Default: onchain')
    .option('--preset <preset>', 'Load an alternate setting preset')
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

      options.port = Number.parseInt(options.port) || 8545;

      let node: CannonRpcNode;
      if (options.chainId) {
        const settings = resolveCliSettings(options);

        const { provider } = await resolveWriteProvider(settings, Number.parseInt(options.chainId));

        if (options.providerUrl) {
          const providerChainId = (await provider.getNetwork()).chainId;
          if (providerChainId != options.chainId) {
            throw new Error(
              `Supplied providerUrl's blockchain chainId ${providerChainId} does not match with chainId you provided ${options.chainId}`
            );
          }
        }

        node = await runRpc(pickAnvilOptions(options), {
          forkProvider: provider.passThroughProvider as ethers.providers.JsonRpcProvider,
        });
      } else {
        node = await runRpc(pickAnvilOptions(options));
      }

      await run(packages, {
        ...options,
        node,
        helpInformation: program.helpInformation(),
      });
    });
}

async function doBuild(cannonfile: string, settings: string[], opts: any): Promise<[CannonRpcNode | null, ChainArtifacts]> {
  // set debug verbosity
  switch (true) {
    case opts.Vvvv:
      Debug.enable('cannon:*');
      break;
    case opts.Vvv:
      Debug.enable('cannon:builder*');
      break;
    case opts.Vv:
      Debug.enable('cannon:builder,cannon:builder:definition');
      break;
    case opts.v:
      Debug.enable('cannon:builder');
      break;
  }

  debug('do build called with', cannonfile, settings, opts);
  // If the first param is not a cannonfile, it should be parsed as settings
  if (cannonfile !== '-' && !cannonfile.endsWith('.toml')) {
    settings.unshift(cannonfile);
    cannonfile = 'cannonfile.toml';
  }

  const publicSourceCode = true; // TODO: foundry doesn't really have a way to specify whether the contract sources should be public or private
  const parsedSettings = parseSettings(settings);

  const cannonfilePath = path.resolve(cannonfile);
  const projectDirectory = path.resolve(cannonfilePath);

  const cliSettings = resolveCliSettings(opts);

  let provider: CannonWrapperGenericProvider;
  let node: CannonRpcNode | null = null;

  let getSigner: ((s: string) => Promise<ethers.Signer>) | undefined = undefined;
  let getDefaultSigner: (() => Promise<ethers.Signer>) | undefined = undefined;

  let chainId: number | undefined = undefined;

  if (!opts.chainId && !opts.providerUrl) {
    // doing a local build, just create a anvil rpc
    node = await runRpc({
      ...pickAnvilOptions(opts),
      // https://www.lifewire.com/port-0-in-tcp-and-udp-818145
      port: 0,
    });

    provider = getProvider(node);
  } else {
    if (opts.providerUrl && !opts.chainId) {
      const _provider = new ethers.providers.JsonRpcProvider(opts.providerUrl);
      chainId = (await _provider.getNetwork()).chainId;
    } else {
      chainId = opts.chainId;
    }
    const p = await resolveWriteProvider(cliSettings, chainId as number);

    if (opts.dryRun) {
      node = await runRpc(
        {
          ...pickAnvilOptions(opts),
          chainId,
          // https://www.lifewire.com/port-0-in-tcp-and-udp-818145
          port: 0,
        },
        {
          forkProvider: p.provider.passThroughProvider as ethers.providers.JsonRpcProvider,
        }
      );

      provider = getProvider(node);

      // need to set default signer to make sure it is accurate to the actual signer
      getDefaultSigner = async () => {
        const addr = p.signers.length > 0 ? await p.signers[0].getAddress() : '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
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
  const { name, version, def } = await loadCannonfile(cannonfilePath);

  const { outputs } = await build({
    provider,
    def,
    packageDefinition: {
      name,
      version,
      settings: parsedSettings,
    },
    pkgInfo: {},
    getArtifact: (name) => getFoundryArtifact(name, projectDirectory),
    getSigner,
    getDefaultSigner,
    upgradeFrom: opts.upgradeFrom,
    presetArg: opts.preset,
    wipe: opts.wipe,
    persist: !opts.dryRun,
    overrideResolver: opts.dryRun ? await createDryRunRegistry(cliSettings) : undefined,
    publicSourceCode,
    providerUrl: cliSettings.providerUrl,

    gasPrice: opts.gasPrice,
    gasFee: opts.maxGasFee,
    priorityGasFee: opts.maxPriorityGasFee,
  });

  return [node, outputs];
}

addAnvilOptions(program.command('build'))
  .description('Build a package from a Cannonfile')
  .argument('[cannonfile]', 'Path to a cannonfile', 'cannonfile.toml')
  .argument('[settings...]', 'Custom settings for building the cannonfile')
  .option('-n --provider-url [url]', 'RPC endpoint to execute the deployment on')
  .option('-c --chain-id <number>', 'The chain id to run against')
  .option('-p --preset <preset>', 'The preset label for storing the build with the given settings')
  .option('--dry-run', 'Simulate building on a local fork rather than deploying on the real network')
  .option('--private-key [key]', 'Specify a comma separated list of private keys which may be needed to sign a transaction')
  .option('--wipe', 'Clear the existing deployment state and start this deploy from scratch.')
  .option('--upgrade-from [cannon-package:0.0.1]', 'Specify a package to use as a new base for the deployment.')
  .option('--registry-priority <registry>', 'Change the default registry to read from first. Default: onchain')
  .option('--gas-price <gasPrice>', 'Specify a gas price to use for the deployment')
  .option('--max-gas-fee <maxGasFee>', 'Specify max fee per gas (EIP-1559) for deployment')
  .option('--max-priority-gas-fee <maxpriorityGasFee>', 'Specify max fee per gas (EIP-1559) for deployment')
  .option('--skip-compile', 'Skip the compilation step and use the existing artifacts')
  .option('-q --quiet', 'Suppress extra logging')
  .option('-v', 'print logs for builder,equivalent to DEBUG=cannon:builder')
  .option(
    '-vv',
    'print logs for builder and its definition section,equivalent to DEBUG=cannon:builder,cannon:builder:definition'
  )
  .option('-vvv', 'print logs for builder and its all sub sections,equivalent to DEBUG=cannon:builder*')
  .option('-vvvv', 'print all cannon logs,equivalent to DEBUG=cannon:*')
  .showHelpAfterError('Use --help for more information.')
  .action(async (cannonfile, settings, opts) => {
    const cannonfilePath = path.resolve(cannonfile);
    const projectDirectory = path.dirname(cannonfilePath);

    console.log(bold('Building the foundry project using forge build...'));
    if (!opts.skipCompile) {
      const forgeBuildProcess = spawn('forge', ['build'], { cwd: projectDirectory });
      await new Promise((resolve) => {
        forgeBuildProcess.on('exit', (code) => {
          if (code === 0) {
            console.log(green('forge build succeeded'));
          } else {
            console.log(red('forge build failed'));
            console.log('Continuing with cannon build...');
          }
          resolve(null);
        });
      });
    } else {
      console.log(yellow('Skipping forge build...'));
    }

    const [node] = await doBuild(cannonfile, settings, opts);

    node?.kill();
  });

program
  .command('verify')
  .description('Verify a package on Etherscan')
  .argument('<packageName>', 'Name and version of the Cannon package to verify')
  .option('-a --api-key <apiKey>', 'Etherscan API key')
  .option('-c --chain-id <chainId>', 'Chain ID of deployment to verify', '1')
  .option('-p --preset <preset>', 'Preset of the deployment to verify')
  .action(async function (packageName, options) {
    const { verify } = await import('./commands/verify');
    await verify(packageName, options.apiKey, options.preset, options.chainId);
  });

program
  .command('alter')
  .description('Change a cannon package outside of the regular build process.')
  .argument('<packageName>', 'Name and version of the Cannon package to alter')
  .argument(
    '<command>',
    'Alteration command to execute. Current options: set-url, set-contract-address, mark-complete, mark-incomplete'
  )
  .argument('[options...]', 'Additional options for your alteration command')
  .option('-c --chain-id <chainId>', 'Chain ID of deployment to alter')
  .option('-p --preset <preset>', 'Preset of the deployment to alter')
  .action(async function (packageName, command, options, flags) {
    const { alter } = await import('./commands/alter');
    // note: for command below, pkgInfo is empty because forge currently supplies no package.json or anything similar
    await alter(packageName, flags.chainId, flags.preset, {}, command, options, {
      getArtifact: getFoundryArtifact,
    });
  });

program
  .command('publish')
  .description('Publish a Cannon package to the registry')
  .argument('<packageName>', 'Name and version of the package to publish')
  .option('-n --registry-provider-url [url]', 'RPC endpoint to publish to')
  .option('--private-key <key>', 'Private key to use for publishing the registry package')
  .option('--chain-id <number>', 'The chain ID of the package to publish')
  .option('--preset <preset>', 'The preset of the packages to publish')
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
  .action(async function (packageRef, options) {
    const { publish } = await import('./commands/publish');

    const cliSettings = resolveCliSettings(options);
    const p = await resolveRegistryProvider(cliSettings);

    const overrides: ethers.Overrides = {};

    if (!options.chainId) {
      throw new Error(
        'Please provide a chainId using the format: --chain-id <number>. For example, 13370 is the chainId for a local build.'
      );
    }

    if (options.maxFeePerGas) {
      overrides.maxFeePerGas = ethers.utils.parseUnits(options.maxFeePerGas, 'gwei');
    }

    if (options.maxPriorityFeePerGas) {
      overrides.maxPriorityFeePerGas = ethers.utils.parseUnits(options.maxPriorityFeePerGas, 'gwei');
    }

    if (options.gasLimit) {
      overrides.gasLimit = options.gasLimit;
    }
    console.log(
      `Settings:\nMax Fee Per Gas: ${
        overrides.maxFeePerGas ? overrides.maxFeePerGas.toString() : 'default'
      }\nMax Priority Fee Per Gas: ${
        overrides.maxPriorityFeePerGas ? overrides.maxPriorityFeePerGas.toString() : 'default'
      }\nGas Limit: ${
        overrides.gasLimit ? overrides.gasLimit : 'default'
      }\nTo alter these settings use the parameters '--max-fee-per-gas', '--max-priority-fee-per-gas', '--gas-limit'.`
    );

    await publish({
      packageRef,
      signer: p.signers[0],
      tags: options.tags.split(','),
      chainId: options.chainId ? Number.parseInt(options.chainId) : undefined,
      presetArg: options.preset ? (options.preset as string) : undefined,
      quiet: options.quiet,
      overrides,
    });
  });

program
  .command('inspect')
  .description('Inspect the details of a Cannon package')
  .argument('<packageName>', 'Name and version of the cannon package to inspect')
  .option('-c --chain-id <chainId>', 'Chain ID of the variant to inspect', '13370')
  .option('-p --preset <preset>', 'Preset of the variant to inspect')
  .option('-j --json', 'Output as JSON')
  .option(
    '-w --write-deployments <writeDeployments>',
    'Path to write the deployments data (address and ABIs), like "./deployments"'
  )
  .option('-q --quiet', 'Suppress extra logging')
  .action(async function (packageName, options) {
    const { inspect } = await import('./commands/inspect');
    resolveCliSettings(options);
    await inspect(packageName, options.chainId, options.preset, options.json, options.writeDeployments);
  });

program
  .command('prune')
  .description('Clean cannon storage of excessive/transient build files older than a certain age')
  .option(
    '--filter-package <packageName>',
    'Only keep deployments in local storage which match the given package name. Default: do not filter'
  )
  .option('--filter-variant <variant>', 'Only keep deployments which match the specifiec variant(s). Default: do not filter')
  .option(
    '--keep-age <seconds>',
    'Number of seconds old a package must be before it should be deleted',
    (86400 * 30).toString()
  )
  .option('--dry-run', 'Print out information about prune without committing')
  .option('-y --yes', 'Skip confirmation prompt')
  .action(async function (options) {
    const { prune } = await import('./commands/prune');
    resolveCliSettings(options);

    const registry = await createDefaultReadRegistry(resolveCliSettings());

    const loader = getMainLoader(resolveCliSettings());

    const storage = new CannonStorage(registry, loader);

    console.log('Scanning for storage artifacts to prune (this may take some time)...');

    const [pruneUrls, pruneStats] = await prune(
      storage,
      options.filterPackage?.split(',') || '',
      options.filterVariant?.split(',') || '',
      options.keepAge
    );

    if (pruneUrls.length) {
      console.log(bold(`Found ${pruneUrls.length} storage artifacts to prune.`));
      console.log(`Matched with Registry: ${pruneStats.matchedFromRegistry}`);
      console.log(`Not Expired: ${pruneStats.notExpired}`);
      console.log(`Not Cannon Package: ${pruneStats.notCannonPackage}`);

      if (options.dryRun) {
        process.exit(0);
      }

      if (!options.yes) {
        const verification = await prompts({
          type: 'confirm',
          name: 'confirmation',
          message: 'Delete these artifacts?',
          initial: true,
        });

        if (!verification.confirmation) {
          console.log('Cancelled');
          process.exit(1);
        }
      }

      for (const url of pruneUrls) {
        console.log(`delete ${url}`);
        try {
          await storage.deleteBlob(url);
        } catch (err: any) {
          console.error(`Failed to delete ${url}: ${err.message}`);
        }
      }

      console.log('Done!');
    } else {
      console.log(bold('Nothing to prune.'));
    }
  });

program
  .command('trace')
  .description('Get a full stack trace for a transaction hash or explicit transaction call')
  .argument('<packageName>', 'Name and version of the cannon package to use')
  .argument(
    '<transactionHash OR bytes32Data>',
    'base 16 encoded transaction data to input to a function call, or transaction hash'
  )
  .requiredOption('-c --chain-id <chainId>', 'Chain ID of the variant to inspect', '13370')
  .option('-f --from <source>', 'Caller for the transaction to trace')
  .option('-t --to <target>', 'Contract which should be called')
  .option('-v --value <value>', 'Amonut of gas token to send in the traced call')
  .option('-b --block-number <value>', 'The block to simulate when the call is on')
  .option('-p --preset <preset>', 'Preset of the variant to inspect', 'main')
  .option('-n --provider-url [url]', 'RPC endpoint to fork off of')
  .option('-j --json', 'Output as JSON')
  .action(async function (packageName, data, options) {
    const { trace } = await import('./commands/trace');

    await trace({
      packageName,
      data,
      chainId: options.chainId,
      preset: options.preset,
      providerUrl: options.providerUrl,
      from: options.from,
      to: options.to,
      value: options.value,
      block: options.blockNumber,
      json: options.json,
    });
  });

program
  .command('decode')
  .description('decode transaction data using the ABIs of the given Cannon package')
  .argument('<packageName>', 'Name and version of the cannon package to use')
  .argument('<bytes32Data...>', 'bytes32 encoded transaction data to decode')
  .option('-c --chain-id <chainId>', 'Chain ID of the variant to inspect', '13370')
  .option('-p --preset <preset>', 'Preset of the variant to inspect', 'main')
  .option('-j --json', 'Output as JSON')
  .action(async function (packageRef, data, options) {
    const { decode } = await import('./commands/decode');

    await decode({
      packageRef,
      data,
      chainId: options.chainId,
      presetArg: options.preset,
      json: options.json,
    });
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
  .option('--registry-priority <registry>', 'Change the default registry to read from first. Default: onchain')
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

    await new Promise((resolve) => {
      forgeCmd.on('close', (code: number) => {
        console.log(`forge exited with code ${code}`);
        node?.kill();
        resolve({});
      });
    });
  });

program
  .command('interact')
  .description('Start an interactive terminal against a set of active cannon deployments')
  .argument('<packageName>', 'Package to deploy, optionally with custom settings', parsePackageArguments)
  .requiredOption('-c --chain-id <chainId>', 'Chain ID of deployment to interact with ')
  .option('-n --provider-url [url]', 'RPC endpoint to execute the deployment on')
  .option('-p --preset <preset>', 'Load an alternate setting preset', 'main')
  .option('--mnemonic <phrase>', 'Use the specified mnemonic to initialize a chain of signers while running')
  .option('--private-key [key]', 'Specify a comma separated list of private keys which may be needed to sign a transaction')
  .option('--gas-price <gasPrice>', 'Specify a gas price to use for the deployment')
  .option('--max-gas-fee <maxGasFee>', 'Specify max fee per gas (EIP-1559) for deployment')
  .option('--max-priority-gas-fee <maxpriorityGasFee>', 'Specify max fee per gas (EIP-1559) for deployment')
  .action(async function (packageDefinition, opts) {
    const cliSettings = resolveCliSettings(opts);

    const p = await resolveWriteProvider(cliSettings, opts.chainId);

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
        gasPrice: opts.gasPrice,
        gasFee: opts.maxGasFee,
        priorityGasFee: opts.maxPriorityFee,
      },
      resolver,
      getMainLoader(cliSettings)
    );

    const selectedPreset = packageDefinition.preset || opts.preset || 'main';

    const deployData = await runtime.readDeploy(
      `${packageDefinition.name}:${packageDefinition.version}`,
      selectedPreset,
      runtime.chainId
    );

    if (!deployData) {
      throw new Error(
        `deployment not found: ${packageDefinition.name}:${packageDefinition.version}@${selectedPreset}. please make sure it exists for the given preset and current network.`
      );
    }

    const outputs = await getOutputs(runtime, new ChainDefinition(deployData.def), deployData.state);

    if (!outputs) {
      throw new Error(
        `no cannon build found for chain ${networkInfo.chainId}/${selectedPreset}. Did you mean to run instead?`
      );
    }

    const contracts = [getContractsRecursive(outputs, p.provider)];

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
  .description('Initialize cannon settings file')
  .action(async function () {
    const { setup } = await import('./commands/setup');
    await setup();
  });

program
  .command('clean')
  .description('Delete packages cache directories')
  .option('--no-confirm', 'Do not ask for confirmation before deleting')
  .action(async function ({ noConfirm }) {
    const { clean } = await import('./commands/clean');
    const executed = await clean(!noConfirm);
    if (executed) console.log('Complete!');
  });

const pluginCmd = program.command('plugin').description('Manage Cannon plug-in modules');

pluginCmd
  .command('list')
  .description('List all installed plugins')
  .action(async function () {
    console.log(green(bold('\n=============== Installed Plugins ===============')));
    const installedPlugins = await listInstalledPlugins();
    installedPlugins.forEach((plugin) => console.log(yellow(plugin)));
  });

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
