import _ from 'lodash';
import ethers from 'ethers';
import { bold, greenBright, yellow, gray, cyan, yellowBright } from 'chalk';
import {
  CANNON_CHAIN_ID,
  ChainDefinition,
  ContractArtifact,
  Events,
  ChainBuilderRuntime,
  build as cannonBuild,
  createInitialContext,
  getOutputs,
  DeploymentInfo,
  CannonWrapperGenericProvider,
} from '@usecannon/builder';
import { readMetadataCache } from '../helpers';
import { PackageSpecification } from '../types';
import { printChainBuilderOutput } from '../util/printer';
import { CannonRegistry } from '@usecannon/builder';
import { resolveCliSettings } from '../settings';
import { createDefaultReadRegistry } from '../registry';

import { listInstalledPlugins, loadPlugins } from '../plugins';
import { getMainLoader } from '../loader';

import pkg from '../../package.json';

interface Params {
  provider: CannonWrapperGenericProvider;
  def?: ChainDefinition;
  packageDefinition: PackageSpecification;
  upgradeFrom?: string;
  pkgInfo: any;

  getArtifact?: (name: string) => Promise<ContractArtifact>;
  getSigner?: (addr: string) => Promise<ethers.Signer>;
  getDefaultSigner?: () => Promise<ethers.Signer>;
  projectDirectory?: string;
  presetArg?: string;
  chainId?: number;
  overrideResolver?: CannonRegistry;
  wipe?: boolean;
  persist?: boolean;
  plugins?: boolean;
  publicSourceCode?: boolean;
  providerUrl?: string;
  registryPriority?: 'local' | 'onchain';
  gasPrice?: string;
  gasFee?: string;
  priorityGasFee?: string;
}

export async function build({
  provider,
  def,
  packageDefinition,
  upgradeFrom,
  pkgInfo,
  getArtifact,
  getSigner,
  getDefaultSigner,
  presetArg,
  overrideResolver,
  wipe = false,
  persist = true,
  plugins = true,
  publicSourceCode = false,
  providerUrl,
  registryPriority,
  gasPrice,
  gasFee,
  priorityGasFee,
}: Params) {
  if (wipe && upgradeFrom) {
    throw new Error('wipe and upgradeFrom are mutually exclusive. Please specify one or the other');
  }

  if (!persist && providerUrl) {
    console.log(
      yellowBright(bold('⚠️  This is a simulation. No changes will be made to the chain. No package data will be saved.\n'))
    );
  }

  const { name, version, preset } = packageDefinition;

  if (presetArg && preset) {
    console.warn(
      yellow(
        bold(
          `Duplicate preset definitions in package reference "${name}:${version}@${preset}" and in --preset argument: "${presetArg}"`
        )
      )
    );
    console.warn(yellow(bold(`The --preset option is deprecated. Defaulting to package reference "${preset}"...`)));
  }

  const selectedPreset = preset || presetArg || 'main';

  const cliSettings = resolveCliSettings({ registryPriority });

  if (plugins) {
    await loadPlugins();
  }

  const chainId = (await provider.getNetwork()).chainId;

  const runtimeOptions = {
    provider,
    chainId,

    getArtifact,

    getSigner:
      getSigner ||
      async function (addr: string) {
        // on test network any user can be conjured
        await provider.send('hardhat_impersonateAccount', [addr]);
        await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
        return provider.getSigner(addr);
      },

    getDefaultSigner,

    snapshots: chainId === CANNON_CHAIN_ID,
    allowPartialDeploy: chainId !== CANNON_CHAIN_ID && persist,
    publicSourceCode,
    gasPrice,
    gasFee,
    priorityGasFee,
  };

  const resolver = overrideResolver || (await createDefaultReadRegistry(cliSettings));

  const runtime = new ChainBuilderRuntime(
    runtimeOptions,
    resolver,
    getMainLoader(cliSettings),
    cliSettings.ipfsUrl ? 'ipfs' : 'file'
  );

  let partialDeploy = false;
  runtime.on(Events.PreStepExecute, (t, n, _c, d) => console.log(`${'  '.repeat(d)}exec: ${t}.${n}`));
  runtime.on(Events.SkipDeploy, (n, err, d) => {
    partialDeploy = true;
    console.log(
      `${'  '.repeat(d)}  -> skip ${n} (${
        typeof err === 'object' && err.toString === Object.prototype.toString ? JSON.stringify(err) : err.toString()
      })`
    );
  });

  // Check for existing package
  let oldDeployData: DeploymentInfo | null = null;
  const prevPkg = upgradeFrom || `${name}:${version}`;

  oldDeployData = await runtime.readDeploy(prevPkg, selectedPreset, runtime.chainId);

  // Update pkgInfo (package.json) with information from existing package, if present
  if (oldDeployData && !wipe) {
    console.log('Existing package found.');
    await runtime.restoreMisc(oldDeployData.miscUrl);

    if (!pkgInfo) {
      pkgInfo = oldDeployData.meta;
    }
  } else {
    if (upgradeFrom) {
      throw new Error(`Package "${prevPkg}@${selectedPreset}" not found.`);
    } else {
      console.warn(`Package "${prevPkg}@${selectedPreset}" not found, creating new build...`);
    }
  }
  console.log('');

  let pkgName = packageDefinition?.name;
  let pkgVersion = packageDefinition?.version;

  const resolvedSettings = _.assign(oldDeployData?.options ?? {}, packageDefinition.settings);

  def = def || (oldDeployData ? new ChainDefinition(oldDeployData!.def) : undefined);

  if (!def) {
    throw new Error('no deployment definition to build');
  }

  const initialCtx = await createInitialContext(def, pkgInfo, chainId, resolvedSettings);

  if (!pkgName) {
    pkgName = def.getName(initialCtx);
  }

  if (!pkgVersion) {
    pkgVersion = def.getVersion(initialCtx);
  }

  if (oldDeployData && wipe) {
    console.log(bold('Regenerating package...'));
  } else if (oldDeployData && !upgradeFrom) {
    console.log(bold('Using package...'));
  } else {
    console.log(bold('Generating new package...'));
  }
  console.log('Name: ' + cyan(`${pkgName}`));
  console.log('Version: ' + cyan(`${pkgVersion}`));
  console.log('Preset: ' + cyan(`${selectedPreset}`) + (selectedPreset == 'main' ? gray(' (default)') : ''));
  if (upgradeFrom) {
    console.log(`Upgrading from: ${cyan(upgradeFrom)}`);
  }
  if (publicSourceCode) {
    console.log(gray('Source code will be included in the package'));
  }
  console.log('');

  const providerUrlMsg = providerUrl?.includes(',') ? providerUrl.split(',')[0] : providerUrl;
  console.log(bold(`Building the chain (ID ${chainId}${providerUrlMsg ? ' via ' + providerUrlMsg : ''})...`));
  if (!_.isEmpty(packageDefinition.settings)) {
    console.log('Overriding the default values for the cannonfile’s settings with the following:');
    for (const [key, value] of Object.entries(packageDefinition.settings)) {
      console.log(`  - ${key} = ${value}`);
    }
    console.log('');
  }

  if (plugins) {
    const pluginList = await listInstalledPlugins();

    if (pluginList.length) {
      console.log('plugins:', pluginList.join(', '), 'detected');
    }
  }

  // attach control-c handler
  let ctrlcs = 0;
  const handler = () => {
    if (!runtime.isCancelled()) {
      console.log('interrupt received, finishing current build step and cancelling...');
      console.log('please be patient, or state loss may occur.');
      partialDeploy = true;
      runtime.cancel();
    } else if (ctrlcs < 4) {
      console.log('you really should not try to cancel the build unless you know what you are doing.');
      console.log('continue pressing control-c to FORCE, and UNCLEANLY exit cannon');
    } else {
      console.log('exiting uncleanly. state loss may have occured. please DO NOT raise bug reports.');
      process.exit(1234);
    }
    ctrlcs++;
  };
  if (persist) {
    process.on('SIGINT', handler);
    process.on('SIGTERM', handler);
    process.on('SIGQUIT', handler);
  }

  const newState = await cannonBuild(runtime, def, oldDeployData && !wipe ? oldDeployData.state : {}, initialCtx);

  const outputs = (await getOutputs(runtime, def, newState))!;

  printChainBuilderOutput(outputs);

  // save the state to ipfs
  const miscUrl = await runtime.recordMisc();

  const chainDef = def.toJson();

  chainDef.version = pkgVersion;

  if (miscUrl) {
    const deployUrl = await runtime.putDeploy({
      generator: `cannon cli ${pkg.version}`,
      timestamp: Math.floor(Date.now() / 1000),
      def: chainDef,
      state: newState,
      options: resolvedSettings,
      status: partialDeploy ? 'partial' : 'complete',
      meta: pkgInfo,
      miscUrl: miscUrl,
      chainId: runtime.chainId,
    });

    const metadata = await readMetadataCache(`${pkgName}:${pkgVersion}`);

    const metaUrl = await runtime.putBlob(metadata);

    // locally store cannon packages (version + latest)
    if (persist) {
      await resolver.publish(
        [`${name}:${version}`, `${name}:latest`],
        `${runtime.chainId}-${selectedPreset}`,
        deployUrl!,
        metaUrl!
      );

      // detach the process handler

      process.off('SIGINT', handler);
      process.off('SIGTERM', handler);
      process.off('SIGQUIT', handler);
    }

    if (partialDeploy) {
      console.log(
        yellow(
          bold(
            'WARNING: your deployment was not fully completed. Please inspect the issues listed above, and resolve as necessary.'
          )
        )
      );

      console.log(
        yellow('Rerunning the same build command will attempt to execute skipped steps. It will not re-run executed steps.')
      );

      console.log(
        yellow('To re-run executed steps, add the --wipe flag to the build command: ' + bold('cannon build --wipe'))
      );

      console.log(
        yellow(`This package is not published. Your partial deployment can be accessed from the URL: ${deployUrl}`)
      );

      console.log(yellow('Run ' + bold(`cannon publish ${deployUrl}`) + ' to pin the partial deployment package on IPFS.'));
    } else {
      console.log(
        greenBright(
          `Successfully built package ${bold(`${name}:${version}@${selectedPreset}`)} \n - Deploy Url: ${deployUrl}`
        )
      );
    }
  } else {
    console.log(
      bold(
        yellow(
          `Chain state could not be saved via ${runtime.loaders[runtime.defaultLoaderScheme].getLabel()}
Try a writable endpoint by setting ipfsUrl through \`npx @usecannon/cli setup\` or CANNON_IPFS_URL env var.`
        )
      )
    );
  }
  console.log('');

  provider.artifacts = outputs;

  return { outputs, provider };
}
