import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  CannonStorage,
  CannonWrapperGenericProvider,
  ChainArtifacts,
  ChainBuilderRuntime,
  ChainDefinition,
  getOutputs,
  PackageReference,
  InMemoryRegistry,
  IPFSLoader,
  publishPackage,
} from '@usecannon/builder';
import { bold, gray, green, red, yellow } from 'chalk';
import { Command } from 'commander';
import Debug from 'debug';
import { ethers } from 'ethers';
import prompts from 'prompts';
import pkg from '../package.json';
import { interact } from './commands/interact';
import commandsConfig from './commandsConfig';
import { getFoundryArtifact } from './foundry';
import { checkCannonVersion, filterSettings, loadCannonfile } from './helpers';
import { getMainLoader } from './loader';
import { installPlugin, listInstalledPlugins, removePlugin } from './plugins';
import { createDefaultReadRegistry, createDryRunRegistry } from './registry';
import { CannonRpcNode, getProvider, runRpc } from './rpc';
import { resolveCliSettings } from './settings';
import { PackageSpecification } from './types';
import { pickAnvilOptions } from './util/anvil';
import { getContractsRecursive } from './util/contracts-recursive';
import { parsePackageArguments, parsePackagesArguments, parseSettings } from './util/params';
import { resolveRegistryProvider, resolveWriteProvider } from './util/provider';
import { writeModuleDeployments } from './util/write-deployments';
import './custom-steps/run';

export * from './types';
export * from './constants';
export * from './util/params';

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

function applyCommandsConfig(command: Command, config: any) {
  if (config.description) {
    command.description(config.description);
  }
  if (config.usage) {
    command.usage(config.usage);
  }
  if (config.arguments) {
    config.arguments.map((argument: any) => {
      if (argument.flags === '<packageNames...>') {
        command.argument(argument.flags, argument.description, parsePackagesArguments, argument.defaultValue);
      } else if (command.name() === 'interact' && argument.flags === '<packageName>') {
        command.argument(argument.flags, argument.description, parsePackageArguments, argument.defaultValue);
      } else {
        command.argument(argument.flags, argument.description, argument.defaultValue);
      }
    });
  }
  if (config.anvilOptions) {
    config.anvilOptions.map((option: any) => {
      option.required
        ? command.requiredOption(option.flags, option.description, option.defaultValue)
        : command.option(option.flags, option.description, option.defaultValue);
    });
  }
  if (config.options) {
    config.options.map((option: any) => {
      option.required
        ? command.requiredOption(option.flags, option.description, option.defaultValue)
        : command.option(option.flags, option.description, option.defaultValue);
    });
  }
  return command;
}

function configureRun(program: Command) {
  return applyCommandsConfig(program, commandsConfig.run).action(async function (
    packages: PackageSpecification[],
    options,
    program
  ) {
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

async function doBuild(
  cannonfile: string,
  settings: string[],
  opts: any
): Promise<[CannonRpcNode | null, PackageSpecification, ChainArtifacts, ChainBuilderRuntime]> {
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

  debug('do build called with', cannonfile, settings, filterSettings(opts));
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
      port: opts.port || 0,
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

      getSigner = async (address) => {
        const s = ethers.utils.getAddress(address);

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
  const { name, version, preset, def } = await loadCannonfile(cannonfilePath);

  const pkgSpec: PackageSpecification = {
    name,
    version,
    settings: parsedSettings,
  };

  const { outputs, runtime } = await build({
    provider,
    def,
    packageDefinition: pkgSpec,
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
    writeScript: opts.writeScript,
    writeScriptFormat: opts.writeScriptFormat,

    gasPrice: opts.gasPrice,
    gasFee: opts.maxGasFee,
    priorityGasFee: opts.maxPriorityGasFee,
  });

  return [node, pkgSpec, outputs, runtime];
}

applyCommandsConfig(program.command('build'), commandsConfig.build)
  .showHelpAfterError('Use --help for more information.')
  .action(async (cannonfile, settings, opts) => {
    const cannonfilePath = path.resolve(cannonfile);
    const projectDirectory = path.dirname(cannonfilePath);

    console.log(bold('Building the foundry project...'));
    if (!opts.skipCompile) {
      const forgeBuildProcess = spawn('forge', ['build'], { cwd: projectDirectory });
      await new Promise((resolve, reject) => {
        forgeBuildProcess.on('exit', (code) => {
          if (code === 0) {
            console.log(gray('forge build succeeded'));
          } else {
            console.log(red('forge build failed'));
            console.log(red('Make sure "forge build" runs successfully or use the --skip-compile flag.'));
            reject(new Error(`forge build failed with exit code "${code}"`));
          }
          resolve(null);
        });
      });
    } else {
      console.log(yellow('Skipping forge build...'));
    }
    console.log(''); // Linebreak in CLI to signify end of compilation.

    const [node, pkgSpec, , runtime] = await doBuild(cannonfile, settings, opts);

    if (opts.keepAlive) {
      console.log(
        `Built package RPC URL available at ${
          (getProvider(node!).passThroughProvider as ethers.providers.JsonRpcProvider).connection.url
        }`
      );
      const { run } = await import('./commands/run');
      await run([{ ...pkgSpec, settings: {} }], {
        ...opts,
        resolver: runtime.registry,
        node,
        helpInformation: program.helpInformation(),
      });
    }

    node?.kill();
  });

applyCommandsConfig(program.command('verify'), commandsConfig.verify).action(async function (packageName, options) {
  const { verify } = await import('./commands/verify');
  await verify(packageName, options.apiKey, options.preset, options.chainId);
});

applyCommandsConfig(program.command('alter'), commandsConfig.alter).action(async function (
  packageName,
  command,
  options,
  flags
) {
  const { alter } = await import('./commands/alter');
  // note: for command below, pkgInfo is empty because forge currently supplies no package.json or anything similar
  await alter(packageName, flags.chainId, flags.preset, {}, command, options, {
    getArtifact: getFoundryArtifact,
  });
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
      console.log('Chain ID is required.');
      process.exit(1);
    }

    options.chainId = chainIdPrompt.value;
  }

  await fetch(packageName, options.chainId, ipfsHash, options.metaHash);
});

applyCommandsConfig(program.command('pin'), commandsConfig.pin).action(async function (ipfsHash, options) {
  const cliSettings = resolveCliSettings(options);

  ipfsHash = ipfsHash.replace(/^ipfs:\/\//, '');

  const fromStorage = new CannonStorage(new InMemoryRegistry(), getMainLoader(cliSettings));
  const toStorage = new CannonStorage(new InMemoryRegistry(), {
    ipfs: new IPFSLoader(cliSettings.publishIpfsUrl || cliSettings.ipfsUrl!),
  });

  console.log('Uploading package data for pinning...');

  await publishPackage({
    packageRef: '@ipfs:' + ipfsHash,
    chainId: 13370,
    tags: [], // when passing no tags, it will only copy IPFS files, but not publish to registry
    preset: 'main',
    fromStorage,
    toStorage,
  });

  console.log('Done!');
});

applyCommandsConfig(program.command('publish'), commandsConfig.publish).action(async function (packageRef, options) {
  const { publish } = await import('./commands/publish');

  if (!options.chainId) {
    const chainIdPrompt = await prompts({
      type: 'number',
      name: 'value',
      message: 'Please provide the Chain ID for the package you want to publish',
      initial: 13370,
    });

    if (!chainIdPrompt.value) {
      console.log('Chain ID is required.');
      process.exit(1);
    }

    options.chainId = chainIdPrompt.value;
  }

  const cliSettings = resolveCliSettings(options);
  let { signers } = await resolveRegistryProvider(cliSettings);

  if (!signers.length) {
    const validatePrivateKey = (privateKey: string) => {
      if (ethers.utils.isHexString(privateKey)) {
        return true;
      } else {
        if (privateKey.length === 64) {
          return ethers.utils.isHexString(`0x${privateKey}`);
        }
        return false;
      }
    };

    const keyPrompt = await prompts({
      type: 'text',
      name: 'value',
      message: 'Provide a private key with gas on ETH mainnet to publish this package on the registry',
      style: 'password',
      validate: (key) => (!validatePrivateKey(key) ? 'Private key is not valid' : true),
    });

    if (!keyPrompt.value) {
      console.log('A valid private key is required.');
      process.exit(1);
    }

    const p = await resolveRegistryProvider({ ...cliSettings, privateKey: keyPrompt.value });
    signers = p.signers;
  }

  const overrides: ethers.PayableOverrides = {};

  if (options.maxFeePerGas) {
    overrides.maxFeePerGas = ethers.utils.parseUnits(options.maxFeePerGas, 'gwei');
  }

  if (options.gasLimit) {
    overrides.gasLimit = options.gasLimit;
  }

  if (options.value) {
    overrides.value = options.value;
  }

  console.log(
    `\nSettings:\n - Max Fee Per Gas: ${
      overrides.maxFeePerGas ? overrides.maxFeePerGas.toString() : 'default'
    }\n - Max Priority Fee Per Gas: ${
      overrides.maxPriorityFeePerGas ? overrides.maxPriorityFeePerGas.toString() : 'default'
    }\n - Gas Limit: ${overrides.gasLimit ? overrides.gasLimit : 'default'}\n` +
      " - To alter these settings use the parameters '--max-fee-per-gas', '--max-priority-fee-per-gas', '--gas-limit'.\n"
  );

  await publish({
    packageRef,
    signer: signers[0],
    tags: options.tags ? options.tags.split(',') : [],
    chainId: options.chainId ? Number.parseInt(options.chainId) : undefined,
    presetArg: options.preset ? (options.preset as string) : undefined,
    quiet: options.quiet,
    includeProvisioned: options.includeProvisioned,
    skipConfirm: options.skipConfirm,
    overrides,
  });
});

applyCommandsConfig(program.command('inspect'), commandsConfig.inspect).action(async function (packageName, options) {
  const { inspect } = await import('./commands/inspect');
  resolveCliSettings(options);
  await inspect(packageName, options.chainId, options.preset, options.json, options.writeDeployments, options.sources);
});

applyCommandsConfig(program.command('prune'), commandsConfig.prune).action(async function (options) {
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

applyCommandsConfig(program.command('trace'), commandsConfig.trace).action(async function (packageName, data, options) {
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

applyCommandsConfig(program.command('decode'), commandsConfig.decode).action(async function (packageRef, data, options) {
  const { decode } = await import('./commands/decode');

  await decode({
    packageRef,
    data,
    chainId: options.chainId,
    presetArg: options.preset,
    json: options.json,
  });
});

applyCommandsConfig(program.command('test'), commandsConfig.test).action(async function (cannonfile, forgeOpts, opts) {
  opts.port = 8545;
  const [node, , outputs] = await doBuild(cannonfile, [], opts);

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

applyCommandsConfig(program.command('interact'), commandsConfig.interact).action(async function (packageDefinition, opts) {
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

  const {fullPackageRef} = new PackageReference(packageDefinition);

  const deployData = await runtime.readDeploy(
    fullPackageRef,
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

applyCommandsConfig(program.command('setup'), commandsConfig.setup).action(async function () {
  const { setup } = await import('./commands/setup');
  await setup();
});

applyCommandsConfig(program.command('clean'), commandsConfig.clean).action(async function ({ noConfirm }) {
  const { clean } = await import('./commands/clean');
  const executed = await clean(!noConfirm);
  if (executed) console.log('Complete!');
});

const pluginCmd = applyCommandsConfig(program.command('plugin'), commandsConfig.plugin);

applyCommandsConfig(pluginCmd.command('list'), commandsConfig.plugin.commands.list).action(async function () {
  console.log(green(bold('\n=============== Installed Plug-ins ===============')));
  const installedPlugins = await listInstalledPlugins();
  installedPlugins.forEach((plugin) => console.log(yellow(plugin)));
});

applyCommandsConfig(pluginCmd.command('add'), commandsConfig.plugin.commands.add).action(async function (name) {
  console.log(`Installing plug-in ${name}...`);
  await installPlugin(name);
  console.log('Complete!');
});

applyCommandsConfig(pluginCmd.command('remove'), commandsConfig.plugin.commands.remove).action(async function (name) {
  console.log(`Removing plugin ${name}...`);
  await removePlugin(name);
  console.log('Complete!');
});

export default program;
