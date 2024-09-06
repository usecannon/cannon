import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  CannonStorage,
  ChainBuilderRuntime,
  ChainDefinition,
  DEFAULT_REGISTRY_CONFIG,
  getCannonRepoRegistryUrl,
  getOutputs,
  InMemoryRegistry,
  IPFSLoader,
  OnChainRegistry,
  PackageReference,
  publishPackage,
  traceActions,
} from '@usecannon/builder';
import { bold, gray, green, red, yellow } from 'chalk';
import { Command } from 'commander';
import _ from 'lodash';
import prompts from 'prompts';
import * as viem from 'viem';
import pkg from '../package.json';
import { interact } from './commands/interact';
import commandsConfig from './commands/config';
import {
  checkCannonVersion,
  checkForgeAstSupport,
  ensureChainIdConsistency,
  getPackageReference,
  setupAnvil,
} from './helpers';
import { getMainLoader } from './loader';
import { installPlugin, listInstalledPlugins, removePlugin } from './plugins';
import { createDefaultReadRegistry } from './registry';
import { CannonRpcNode, getProvider, runRpc } from './rpc';
import { resolveCliSettings } from './settings';
import { PackageSpecification } from './types';

import { pickAnvilOptions } from './util/anvil';
import { doBuild } from './util/build';
import { setDebugLevel } from './util/debug-level';
import { error, log, warn } from './util/console';
import { getContractsRecursive } from './util/contracts-recursive';
import { applyCommandsConfig } from './util/commands-config';
import { getChainIdFromRpcUrl, isURL, ProviderAction, resolveProviderAndSigners, resolveProvider } from './util/provider';
import { isPackageRegistered } from './util/register';
import { writeModuleDeployments } from './util/write-deployments';
import './custom-steps/run';

export * from './types';
export * from './constants';
export * from './util/params';
export * from './util/register';
export * from './util/provider';

// Can we avoid doing these exports here so only the necessary files are loaded when running a command?
export type { ChainDefinition, DeploymentInfo } from '@usecannon/builder';
export { alter } from './commands/alter';
export { build } from './commands/build';
export { clean } from './commands/clean';
export { inspect } from './commands/inspect';
export { publish } from './commands/publish';
export { unpublish } from './commands/unpublish';
export { publishers } from './commands/publishers';
export { run } from './commands/run';
export { verify } from './commands/verify';
export { setup } from './commands/setup';
export { runRpc, getProvider } from './rpc';
export { createDefaultReadRegistry, createDryRunRegistry } from './registry';
export { resolveProviderAndSigners } from './util/provider';
export { resolveCliSettings } from './settings';
export { getFoundryArtifact } from './foundry';
export { loadCannonfile } from './helpers';

const program = new Command();

program
  .name('cannon')
  .version(pkg.version)
  .description('Run a cannon package on a local node')
  .enablePositionalOptions()
  .hook('preAction', async (thisCommand) => {
    await checkCannonVersion(pkg.version);
    setDebugLevel(thisCommand.opts());
  });

configureRun(program);
configureRun(program.command('run'));

function configureRun(program: Command) {
  return applyCommandsConfig(program, commandsConfig.run).action(async function (
    packages: PackageSpecification[],
    options,
    program
  ) {
    log(bold('Starting local node...\n'));

    const { run } = await import('./commands/run');

    // backwards compatibility for --port flag
    options['anvil.port'] = Number.parseInt(options.port);

    const cliSettings = resolveCliSettings(options);

    let node: CannonRpcNode;
    if (options.chainId) {
      const { provider } = await resolveProvider({
        action: ProviderAction.ReadProvider,
        cliSettings,
        chainId: Number.parseInt(options.chainId),
      });

      // throw an error if the chainId is not consistent with the provider's chainId
      await ensureChainIdConsistency(cliSettings.rpcUrl, options.chainId);

      node = await runRpc(pickAnvilOptions(options), {
        forkProvider: provider,
      });
    } else {
      if (isURL(cliSettings.rpcUrl)) {
        options.chainId = await getChainIdFromRpcUrl(cliSettings.rpcUrl);

        const { provider } = await resolveProvider({
          action: ProviderAction.ReadProvider,
          cliSettings,
          chainId: Number.parseInt(options.chainId),
        });

        node = await runRpc(pickAnvilOptions(options), {
          forkProvider: provider,
        });
      } else {
        node = await runRpc(pickAnvilOptions(options));
      }
    }

    // Override options with CLI settings
    const pickedCliSettings = _.pick(cliSettings, Object.keys(options));
    const mergedOptions = _.assign({}, options, pickedCliSettings);

    await run(packages, {
      ...mergedOptions,
      node,
      helpInformation: program.helpInformation(),
    });
  });
}

applyCommandsConfig(program.command('build'), commandsConfig.build)
  .showHelpAfterError('Use --help for more information.')
  .action(async (cannonfile, settings, options) => {
    await setupAnvil();

    const cannonfilePath = path.resolve(cannonfile);
    const projectDirectory = path.dirname(cannonfilePath);

    const cliSettings = resolveCliSettings(options);

    // throw an error if the chainId is not consistent with the provider's chainId
    await ensureChainIdConsistency(cliSettings.rpcUrl, options.chainId);

    log(bold('Building the foundry project...'));
    if (!options.skipCompile) {
      let forgeBuildArgs = ['build'];
      if (await checkForgeAstSupport()) {
        forgeBuildArgs = [...forgeBuildArgs, '--ast'];
      }

      const forgeBuildProcess = spawn('forge', forgeBuildArgs, { cwd: projectDirectory, shell: true });

      await new Promise((resolve, reject) => {
        forgeBuildProcess.on('exit', (code) => {
          if (code === 0) {
            log(gray('forge build succeeded'));
          } else {
            log(red('forge build failed'));
            log(red('Make sure "forge build" runs successfully or use the --skip-compile flag.'));
            return reject(new Error(`forge build failed with exit code "${code}"`));
          }

          resolve(null);
        });
      });
    } else {
      log(yellow('Skipping forge build...'));
    }

    log(''); // Linebreak in CLI to signify end of compilation.

    // Override options with CLI settings
    const pickedCliSettings = _.pick(cliSettings, Object.keys(options));
    const mergedOptions = _.assign({}, options, pickedCliSettings);

    const [node, pkgSpec, outputs, runtime] = await doBuild(cannonfile, settings, mergedOptions);

    if (options.writeDeployments) {
      await writeModuleDeployments(path.join(process.cwd(), options.writeDeployments), '', outputs);
      log('');
    }

    if (options.keepAlive && node) {
      log(`The local node will continue running at ${node.host}`);

      const { run } = await import('./commands/run');

      await run([{ ...pkgSpec, settings: {} }], {
        ...mergedOptions,
        resolver: runtime.registry,
        node,
        helpInformation: program.helpInformation(),
      });
    }

    node?.kill();
  });

applyCommandsConfig(program.command('verify'), commandsConfig.verify).action(async function (packageName, options) {
  const { verify } = await import('./commands/verify');

  // Override CLI settings with --api-key value
  options.etherscanApiKey = options.apiKey;

  const cliSettings = resolveCliSettings(options);

  await verify(packageName, cliSettings, options.preset, parseInt(options.chainId));
});

applyCommandsConfig(program.command('diff'), commandsConfig.diff).action(async function (
  packageName,
  projectDirectory,
  options
) {
  const { diff } = await import('./commands/diff');

  const cliSettings = resolveCliSettings(options);

  const foundDiffs = await diff(
    packageName,
    cliSettings,
    options.preset,
    parseInt(options.chainId),
    projectDirectory,
    options.matchContract,
    options.matchSource
  );

  // exit code is the number of differences found--useful for CI checks
  process.exit(foundDiffs);
});

applyCommandsConfig(program.command('alter'), commandsConfig.alter).action(async function (
  packageName,
  command,
  options,
  flags
) {
  const { alter } = await import('./commands/alter');

  const cliSettings = resolveCliSettings(flags);

  // throw an error if the chainId is not consistent with the provider's chainId
  await ensureChainIdConsistency(cliSettings.rpcUrl, flags.chainId);

  // note: for command below, pkgInfo is empty because forge currently supplies no package.json or anything similar
  const newUrl = await alter(
    packageName,
    flags.subpkg ? flags.subpkg.split(',') : [],
    parseInt(flags.chainId),
    cliSettings,
    flags.preset,
    {},
    command,
    options,
    {}
  );

  log(newUrl);
});

applyCommandsConfig(program.command('fetch'), commandsConfig.fetch).action(async function (packageName, ipfsHash, options) {
  const { fetch } = await import('./commands/fetch');

  if (!options.chainId) {
    const chainIdPrompt = await prompts({
      type: 'number',
      name: 'value',
      message: 'Please provide the Chain ID for the deployment you want to fetch',
      initial: 13370,
    });

    if (!chainIdPrompt.value) {
      log('Chain ID is required.');
      process.exit(1);
    }

    options.chainId = chainIdPrompt.value;
  }

  await fetch(packageName, parseInt(options.chainId), ipfsHash, options.metaHash);
});

applyCommandsConfig(program.command('pin'), commandsConfig.pin).action(async function (ref, options) {
  const cliSettings = resolveCliSettings(options);

  const fullPackageRef = await getPackageReference(ref);

  const fromStorage = new CannonStorage(await createDefaultReadRegistry(cliSettings), getMainLoader(cliSettings));

  const toStorage = new CannonStorage(new InMemoryRegistry(), {
    ipfs: new IPFSLoader(cliSettings.publishIpfsUrl || getCannonRepoRegistryUrl()),
  });

  log('Uploading package data for pinning...');

  await publishPackage({
    packageRef: fullPackageRef,
    chainId: options.chainId || 13370,
    tags: [], // when passing no tags, it will only copy IPFS files, but not publish to registry
    fromStorage,
    toStorage,
  });

  log('Done!');
});

applyCommandsConfig(program.command('publish'), commandsConfig.publish).action(async function (
  packageRef,
  options: { [opt: string]: string }
) {
  const { publish } = await import('./commands/publish');

  const cliSettings = resolveCliSettings(options);
  const fullPackageRef = await getPackageReference(packageRef);

  if (!options.chainId) {
    const chainIdPrompt = await prompts({
      type: 'number',
      name: 'value',
      message: 'Please provide the Chain ID for the package you want to publish',
      initial: 13370,
    });

    if (!chainIdPrompt.value) {
      throw new Error('A valid Chain Id is required.');
    }

    options.chainId = chainIdPrompt.value;
  }

  const isDefaultRegistryChains =
    cliSettings.registries[0].chainId === DEFAULT_REGISTRY_CONFIG[0].chainId &&
    cliSettings.registries[1].chainId === DEFAULT_REGISTRY_CONFIG[1].chainId;
  if (!isDefaultRegistryChains) throw new Error('Only default registries are supported for now');

  // mock provider urls when the execution comes from e2e tests
  if (cliSettings.isE2E) {
    // anvil optimism fork
    cliSettings.registries[0].rpcUrl = ['http://127.0.0.1:9546'];
    // anvil mainnet fork
    cliSettings.registries[1].rpcUrl = ['http://127.0.0.1:9545'];
  }

  // initialized optimism as the default registry
  let [writeRegistry] = cliSettings.registries;

  if (!cliSettings.isE2E) {
    const choices = cliSettings.registries.map((p) => ({
      title: `${p.name ?? 'Unknown Network'} (Chain ID: ${p.chainId})`,
      value: p,
    }));

    // override writeRegistry with the picked provider
    writeRegistry = (
      await prompts([
        {
          type: 'select',
          name: 'writeRegistry',
          message: 'Which registry would you like to use? (Cannon will find the package on either):',
          choices,
        },
      ])
    ).writeRegistry;

    log();
  }

  log(bold(`Resolving connection to ${writeRegistry.name} (Chain ID: ${writeRegistry.chainId})...`));

  const readRegistry = _.differenceWith(cliSettings.registries, [writeRegistry], _.isEqual)[0];
  const registryProviders = await Promise.all([
    // write to picked provider
    resolveProviderAndSigners({
      chainId: writeRegistry.chainId!,
      privateKey: cliSettings.privateKey!,
      checkProviders: writeRegistry.rpcUrl,
      action: ProviderAction.WriteProvider,
    }),
    // read from the other one
    resolveProviderAndSigners({
      chainId: readRegistry.chainId!,
      checkProviders: readRegistry.rpcUrl,
      action: ProviderAction.ReadProvider,
    }),
  ]);

  const [writeRegistryProvider] = registryProviders;

  // Check if the package is already registered
  const isRegistered = await isPackageRegistered(registryProviders, packageRef, [
    writeRegistry.address,
    readRegistry.address,
  ]);

  if (!isRegistered) {
    const pkgRef = new PackageReference(fullPackageRef);
    log();
    log(
      gray(
        `Package "${pkgRef.name}" not yet registered, please use "cannon register" to register your package first.\nYou need enough gas on Ethereum Mainnet to register the package on Cannon Registry`
      )
    );
    log();

    if (!options.skipConfirm) {
      const registerPrompt = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'Would you like to register the package now?',
        initial: true,
      });

      if (!registerPrompt.value) {
        return process.exit(0);
      }
    }

    log();
    const { register } = await import('./commands/register');
    await register({ cliSettings, options, packageRefs: [pkgRef], fromPublish: true });
  }

  const overrides: any = {};

  if (options.maxFeePerGas) {
    overrides.maxFeePerGas = viem.parseGwei(options.maxFeePerGas);
  }

  if (options.gasLimit) {
    overrides.gasLimit = options.gasLimit;
  }

  if (options.value) {
    overrides.value = options.value;
  }

  const registryAddress =
    cliSettings.registries.find((registry) => registry.chainId === writeRegistryProvider.provider.chain?.id)?.address ||
    DEFAULT_REGISTRY_CONFIG[0].address;

  const onChainRegistry = new OnChainRegistry({
    signer: writeRegistryProvider.signers[0],
    provider: writeRegistryProvider.provider,
    address: registryAddress,
    overrides,
  });

  log(
    `\nSettings:\n - Max Fee Per Gas: ${
      overrides.maxFeePerGas ? overrides.maxFeePerGas.toString() : 'default'
    }\n - Max Priority Fee Per Gas: ${
      overrides.maxPriorityFeePerGas ? overrides.maxPriorityFeePerGas.toString() : 'default'
    }\n - Gas Limit: ${overrides.gasLimit ? overrides.gasLimit : 'default'}\n` +
      " - To alter these settings use the parameters '--max-fee-per-gas', '--max-priority-fee-per-gas', '--gas-limit'.\n"
  );

  await publish({
    packageRef: fullPackageRef,
    cliSettings,
    onChainRegistry,
    tags: options.tags ? options.tags.split(',') : undefined,
    chainId: options.chainId ? Number(options.chainId) : undefined,
    presetArg: options.preset ? (options.preset as string) : undefined,
    quiet: !!options.quiet,
    includeProvisioned: !options.excludeCloned,
    skipConfirm: !!options.skipConfirm,
  });
});

applyCommandsConfig(program.command('unpublish'), commandsConfig.unpublish).action(async function (packageRef, options) {
  const { unpublish } = await import('./commands/unpublish');

  const cliSettings = resolveCliSettings(options);

  await unpublish({ cliSettings, options, packageRef });
});

applyCommandsConfig(program.command('register'), commandsConfig.register).action(async function (packageRef, options) {
  const { register } = await import('./commands/register');

  const cliSettings = resolveCliSettings(options);

  await register({ cliSettings, options, packageRefs: packageRef, fromPublish: false });
});

applyCommandsConfig(program.command('publishers'), commandsConfig.publishers).action(async function (packageRef, options) {
  const { publishers } = await import('./commands/publishers');

  const cliSettings = resolveCliSettings(options);

  await publishers({ cliSettings, options, packageRef });
});

applyCommandsConfig(program.command('inspect'), commandsConfig.inspect).action(async function (packageName, options) {
  const { inspect } = await import('./commands/inspect');

  const cliSettings = resolveCliSettings(options);

  await inspect(
    packageName,
    cliSettings,
    options.chainId,
    options.preset,
    options.json,
    options.writeDeployments,
    options.sources
  );
});

applyCommandsConfig(program.command('prune'), commandsConfig.prune).action(async function (options) {
  const { prune } = await import('./commands/prune');

  const cliSettings = resolveCliSettings(options);

  const registry = await createDefaultReadRegistry(cliSettings);

  const loader = getMainLoader(cliSettings);

  const storage = new CannonStorage(registry, loader);

  log('Scanning for storage artifacts to prune (this may take some time)...');

  const [pruneUrls, pruneStats] = await prune(
    storage,
    options.filterPackage?.split(',') || '',
    options.filterVariant?.split(',') || '',
    options.keepAge
  );

  if (pruneUrls.length) {
    log(bold(`Found ${pruneUrls.length} storage artifacts to prune.`));
    log(`Matched with Registry: ${pruneStats.matchedFromRegistry}`);
    log(`Not Expired: ${pruneStats.notExpired}`);
    log(`Not Cannon Package: ${pruneStats.notCannonPackage}`);

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
        log('Cancelled');
        process.exit(1);
      }
    }

    for (const url of pruneUrls) {
      log(`delete ${url}`);
      try {
        await storage.deleteBlob(url);
      } catch (err: any) {
        error(`Failed to delete ${url}: ${err.message}`);
      }
    }

    log('Done!');
  } else {
    log(bold('Nothing to prune.'));
  }
});

applyCommandsConfig(program.command('trace'), commandsConfig.trace).action(async function (packageRef, data, options) {
  const { trace } = await import('./commands/trace');

  const cliSettings = resolveCliSettings(options);

  const isRpcUrl = isURL(cliSettings.rpcUrl);

  let chainId = options.chainId ? Number(options.chainId) : undefined;

  if (!chainId && isRpcUrl) {
    chainId = await getChainIdFromRpcUrl(cliSettings.rpcUrl);
  }

  // throw an error if both chainId and rpcUrl are not provided
  if (!chainId && !isRpcUrl) {
    throw new Error('Please provide one of the following options: --chain-id or --rpc-url');
  }

  // throw an error if the chainId is not consistent with the provider's chainId
  await ensureChainIdConsistency(cliSettings.rpcUrl, chainId);

  await trace({
    packageRef,
    data,
    chainId: chainId!, // chainId is guaranteed to be defined here
    preset: options.preset,
    cliSettings,
    from: options.from,
    to: options.to,
    value: options.value,
    block: options.blockNumber,
    json: options.json,
  });
});

applyCommandsConfig(program.command('decode'), commandsConfig.decode).action(async function (packageRef, data, options) {
  const { decode } = await import('./commands/decode');

  const cliSettings = resolveCliSettings(options);

  await decode({
    packageRef,
    data,
    chainId: options.chainId ? parseInt(options.chainId) : undefined,
    rpcUrl: cliSettings.rpcUrl,
    presetArg: options.preset,
    json: options.json,
  });
});

applyCommandsConfig(program.command('test'), commandsConfig.test).action(async function (cannonfile, forgeOpts, options) {
  options.port = 0;

  const cliSettings = resolveCliSettings(options);

  if (cliSettings.rpcUrl.startsWith('https')) {
    options.dryRun = true;
  }

  // throw an error if the chainId is not consistent with the provider's chainId
  await ensureChainIdConsistency(cliSettings.rpcUrl, options.chainId);

  const [node, , outputs] = await doBuild(cannonfile, [], options);

  // basically we need to write deployments here
  await writeModuleDeployments(path.join(process.cwd(), 'deployments/test'), '', outputs);

  // after the build is done we can run the forge tests for the user
  await getProvider(node!)!.mine({ blocks: 1 });

  const forgeProcess = spawn('forge', [options.forgeCmd, '--fork-url', node!.host, ...forgeOpts], { stdio: 'inherit' });

  await new Promise(() => {
    forgeProcess.on('close', (code: number) => {
      log(`forge exited with code ${code}`);
      node?.kill();
      process.exit(code);
    });
  });
});

applyCommandsConfig(program.command('interact'), commandsConfig.interact).action(async function (
  packageDefinition: PackageSpecification,
  options
) {
  const cliSettings = resolveCliSettings(options);

  let chainId: number | undefined = options.chainId ? Number(options.chainId) : undefined;

  const isRpcUrl = isURL(cliSettings.rpcUrl);

  // if chainId is not provided, get it from the provider
  if (!chainId && isRpcUrl) {
    chainId = await getChainIdFromRpcUrl(cliSettings.rpcUrl);
  }

  // throw an error if both chainId and rpcUrl are not provided
  if (!chainId && !isRpcUrl) {
    throw new Error('Please provide one of the following options: --chain-id or --rpc-url');
  }

  // throw an error if the chainId is not consistent with the provider's chainId
  await ensureChainIdConsistency(cliSettings.rpcUrl, chainId);

  const { provider, signers } = await resolveProvider({
    action: ProviderAction.OptionalWriteProvider,
    cliSettings,
    chainId: chainId!,
  });

  const resolver = await createDefaultReadRegistry(cliSettings);

  const [name, version] = [packageDefinition.name, packageDefinition.version];
  let preset = packageDefinition.preset;

  // Handle deprecated preset specification
  if (options.preset) {
    warn(
      yellow(
        bold(
          'The --preset option will be deprecated soon. Reference presets in the package reference using the format name:version@preset'
        )
      )
    );
    preset = options.preset;
  }

  const fullPackageRef = PackageReference.from(name, version, preset).fullPackageRef;

  const runtime = new ChainBuilderRuntime(
    {
      provider,
      chainId: chainId!, // chainId is guaranteed to be defined here
      async getSigner(address: viem.Address) {
        // on test network any user can be conjured
        //await p.provider.impersonateAccount({ address: addr });
        //await p.provider.setBalance({ address: addr, value: viem.parseEther('10000') });
        return { address: address, wallet: provider };
      },
      snapshots: false,
      allowPartialDeploy: false,
      gasPrice: options.gasPrice,
      gasFee: options.maxGasFee,
      priorityGasFee: options.maxPriorityFee,
    },
    resolver,
    getMainLoader(cliSettings)
  );

  const deployData = await runtime.readDeploy(fullPackageRef, runtime.chainId);

  if (!deployData) {
    throw new Error(
      `deployment not found for package: ${fullPackageRef}. please make sure it exists for the given preset and current network.`
    );
  }

  const outputs = await getOutputs(runtime, new ChainDefinition(deployData.def), deployData.state);

  if (!outputs) {
    throw new Error(
      `no cannon build found for chain ${chainId} with preset "${preset}". Did you mean to run the package instead?`
    );
  }

  const contracts = [getContractsRecursive(outputs)];

  const extendedProvider = provider.extend(traceActions(outputs) as any);

  await interact({
    packages: [packageDefinition],
    contracts,
    signer: signers[0],
    provider: extendedProvider,
  });
});

applyCommandsConfig(program.command('setup'), commandsConfig.setup).action(async function () {
  const { setup } = await import('./commands/setup');
  await setup();
});

applyCommandsConfig(program.command('clean'), commandsConfig.clean).action(async function ({ noConfirm }) {
  const { clean } = await import('./commands/clean');
  const executed = await clean(!noConfirm);
  if (executed) log('Complete!');
});

const pluginCmd = applyCommandsConfig(program.command('plugin'), commandsConfig.plugin);

applyCommandsConfig(pluginCmd.command('list'), commandsConfig.plugin.commands.list).action(async function () {
  log(green(bold('\n=============== Installed Plug-ins ===============')));
  const installedPlugins = await listInstalledPlugins();
  installedPlugins.forEach((plugin) => log(yellow(plugin)));
});

applyCommandsConfig(pluginCmd.command('add'), commandsConfig.plugin.commands.add).action(async function (name) {
  log(`Installing plug-in ${name}...`);
  await installPlugin(name);
  log('Complete!');
});

applyCommandsConfig(pluginCmd.command('remove'), commandsConfig.plugin.commands.remove).action(async function (name) {
  log(`Removing plugin ${name}...`);
  await removePlugin(name);
  log('Complete!');
});

export default program;
