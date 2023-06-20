import _ from 'lodash';
import ethers from 'ethers';
import { bold, greenBright, red, yellow, gray, cyan, yellowBright } from 'chalk';
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
import { loadCannonfile, readMetadataCache, saveToMetadataCache } from '../helpers';
import { PackageSpecification } from '../types';
import { printChainBuilderOutput } from '../util/printer';
import { CannonRegistry } from '@usecannon/builder';
import { resolveCliSettings } from '../settings';
import { createDefaultReadRegistry } from '../registry';

import { listInstalledPlugins, loadPlugins } from '../plugins';
import { getMainLoader } from '../loader';

interface Params {
  provider: CannonWrapperGenericProvider;
  cannonfilePath?: string;
  packageDefinition: PackageSpecification;
  upgradeFrom?: string;
  pkgInfo: any;

  getArtifact?: (name: string) => Promise<ContractArtifact>;
  getSigner?: (addr: string) => Promise<ethers.Signer>;
  getDefaultSigner?: () => Promise<ethers.Signer>;
  projectDirectory?: string;
  preset?: string;
  chainId?: number;
  overrideResolver?: CannonRegistry;
  wipe?: boolean;
  persist?: boolean;
  plugins?: boolean;
  publicSourceCode?: boolean;
  providerUrl?: string;

  gasPrice?: string;
  gasFee?: string;
  priorityGasFee?: string;
}

export async function build({
  provider,
  cannonfilePath,
  packageDefinition,
  upgradeFrom,
  pkgInfo,
  getArtifact,
  getSigner,
  getDefaultSigner,
  preset = 'main',
  overrideResolver,
  wipe = false,
  persist = true,
  plugins = true,
  publicSourceCode = false,
  providerUrl,
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

  const cliSettings = resolveCliSettings();

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
  const prevPkg = upgradeFrom || `${packageDefinition.name}:${packageDefinition.version}`;

  console.log(bold(`Checking IPFS for package ${prevPkg}...`));
  oldDeployData = await runtime.readDeploy(prevPkg, preset || 'main', runtime.chainId);

  // Update pkgInfo (package.json) with information from existing package, if present
  if (oldDeployData && !wipe) {
    console.log('Existing package found.');
    await runtime.restoreMisc(oldDeployData.miscUrl);

    if (!pkgInfo) {
      pkgInfo = oldDeployData.meta;
    }
  } else {
    console.log('No existing package found.');
  }
  console.log('');

  let pkgName, pkgVersion;
  let def: ChainDefinition;
  if (cannonfilePath) {
    const { def: overrideDef, name, version, cannonfile } = await loadCannonfile(cannonfilePath);

    if (!name) {
      throw new Error(red('Your cannonfile is missing a name. Add one to the top of the file like: name = "my-package"'));
    }

    if (!version) {
      throw new Error(red('Your cannonfile is missing a version. Add one to the top of the file like: version = "1.0.0"'));
    }

    if (name !== packageDefinition.name || version !== packageDefinition.version) {
      throw new Error(red('Your cannonfile manifest does not match requseted packageDefinitionDeployment'));
    }

    await saveToMetadataCache(`${name}:${version}`, 'cannonfile', cannonfile);

    pkgName = name;
    pkgVersion = version;

    def = overrideDef;
  } else if (oldDeployData) {
    def = new ChainDefinition(oldDeployData.def);
  } else {
    throw new Error(
      red(
        'No deployment definition found. Make sure you have a recorded deployment for the requested cannon package, or supply a cannonfile to build one.'
      )
    );
  }

  const resolvedSettings = _.assign(oldDeployData?.options ?? {}, packageDefinition.settings);

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
  console.log('Preset: ' + cyan(`${preset}`) + (preset == 'main' ? gray(' (default)') : ''));
  if (upgradeFrom) {
    console.log(`Upgrading from: ${cyan(upgradeFrom)}`);
  }
  if (publicSourceCode) {
    console.log(gray('Source code will be included in the package'));
  }
  console.log('');

  const providerUrlMsg = providerUrl?.includes(',') ? providerUrl.split(',')[0] : providerUrl;
  console.log(
    bold(
      `Building the chain (ID ${chainId}${providerUrlMsg ? ' via ' + providerUrlMsg : ''}) into the state defined in ${
        cannonfilePath ? cannonfilePath?.split('/').pop() : pkgName
      }...`
    )
  );
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

  if (persist) {
    const handler = () => {
      console.log('interrupt received, finishing current build step and cancelling...');
      console.log('please be patient, or state loss may occur.');
      partialDeploy = true;
      runtime.cancel();
    };

    process.on('SIGINT', handler);
    process.on('SIGTERM', handler);
    process.on('SIGQUIT', handler);
  }

  const newState = await cannonBuild(runtime, def, oldDeployData && !wipe ? oldDeployData.state : {}, initialCtx);

  const outputs = (await getOutputs(runtime, def, newState))!;

  printChainBuilderOutput(outputs);

  // save the state to ipfs
  const miscUrl = await runtime.recordMisc();

  if (miscUrl) {
    const deployUrl = await runtime.putDeploy({
      def: def.toJson(),
      state: newState,
      options: resolvedSettings,
      status: partialDeploy ? 'partial' : 'complete',
      meta: pkgInfo,
      miscUrl: miscUrl,
      chainId: runtime.chainId,
    });

    const metaUrl = await runtime.putBlob(await readMetadataCache(`${pkgName}:${pkgVersion}`));

    if (persist) {
      await resolver.publish(
        [`${packageDefinition.name}:latest`, `${packageDefinition.name}:${packageDefinition.version}`],
        `${runtime.chainId}-${preset}`,
        deployUrl!,
        metaUrl!
      );
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
        yellow(`This package is not published. Your partial deployment can be accessed from the URL: ${deployUrl}`)
      );
    } else {
      console.log(
        greenBright(
          `Successfully built package ${bold(`${packageDefinition.name}:${packageDefinition.version}`)} (${deployUrl})`
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
