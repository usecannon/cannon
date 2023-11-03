import _ from 'lodash';
import { ethers } from 'ethers';
import { bold, yellow, red, gray, yellowBright, green, cyanBright, magenta } from 'chalk';
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
import { chains } from '../chains';
import { readMetadataCache } from '../helpers';
import { PackageSpecification } from '../types';
import { CannonRegistry, getContractFromPath } from '@usecannon/builder';
import { resolveCliSettings } from '../settings';
import { createDefaultReadRegistry } from '../registry';

import { listInstalledPlugins, loadPlugins } from '../plugins';
import { getMainLoader } from '../loader';

import pkg from '../../package.json';
import { table } from 'table';

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
  const chainName = chains.find((c) => c.chainId === chainId)?.name;
  const nativeCurrencySymbol = chains.find((c) => c.chainId === chainId)?.nativeCurrency.symbol || 'ETH';
  let totalCost = ethers.BigNumber.from(0);

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
  runtime.on(Events.PreStepExecute, (t, n, _c, d) =>
    console.log(cyanBright(`${'  '.repeat(d)}Executing ${`[${t}.${n}]`}...`))
  );
  runtime.on(Events.SkipDeploy, (n, err, d) => {
    partialDeploy = true;
    console.log(
      yellowBright(
        `${'  '.repeat(d)}  \u26A0\uFE0F  Skipping [${n}] (${
          typeof err === 'object' && err.toString === Object.prototype.toString ? JSON.stringify(err) : err.toString()
        })`
      )
    );
  });
  runtime.on(Events.PostStepExecute, (t, n, o, c, ctx, d) => {
    for (const txnKey in o.txns) {
      const txn = o.txns[txnKey];
      console.log(
        `${'  '.repeat(d)}  ${green('\u2714')} Successfully called ${c.func}(${c?.args
          ?.map((arg: any) => (typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : arg))
          .join(', ')})`
      );
      if (txn.signer != defaultSignerAddress) {
        console.log(gray(`${'  '.repeat(d)}  Signer: ${txn.signer}`));
      }
      const contractAddress = getContractFromPath(ctx, c.target[0])?.address;
      if (contractAddress) {
        console.log(gray(`${'  '.repeat(d)}  Contract Address: ${contractAddress}`));
      }
      console.log(gray(`${'  '.repeat(d)}  Transaction Hash: ${txn.hash}`));
      const cost = ethers.BigNumber.from(txn.gasCost).mul(txn.gasUsed);
      totalCost = totalCost.add(cost);
      console.log(
        gray(
          `${'  '.repeat(d)}  Transaction Cost: ${ethers.utils.formatEther(
            cost
          )} ${nativeCurrencySymbol} (${txn.gasUsed.toLocaleString()} gas)`
        )
      );
    }
    for (const contractKey in o.contracts) {
      const contract = o.contracts[contractKey];
      if (contract.deployTxnHash) {
        console.log(
          `${'  '.repeat(d)}  ${green('\u2714')} Successfully deployed ${contract.contractName}${
            c.create2 ? ' using CREATE2' : ''
          }`
        );
        console.log(gray(`${'  '.repeat(d)}  Contract Address: ${contract.address}`));
        console.log(gray(`${'  '.repeat(d)}  Transaction Hash: ${contract.deployTxnHash}`));
        const cost = ethers.BigNumber.from(contract.gasCost).mul(contract.gasUsed);
        totalCost = totalCost.add(cost);
        console.log(
          gray(
            `${'  '.repeat(d)}  Transaction Cost: ${ethers.utils.formatEther(
              cost
            )} ${nativeCurrencySymbol} (${contract.gasUsed.toLocaleString()} gas)`
          )
        );
      }
    }
    for (const extra in o.extras) {
      console.log(gray(`${'  '.repeat(d)}  Stored Event Data: ${extra} = ${o.extras[extra]}`));
    }

    console.log();
  });

  runtime.on(Events.ResolveDeploy, (packageName, preset, chainId, registry, d) =>
    console.log(magenta(`${'  '.repeat(d)}  Resolving ${packageName}@${preset} (Chain ID: ${chainId}) via ${registry}...`))
  );
  runtime.on(Events.DownloadDeploy, (hash, gateway, d) =>
    console.log(gray(`${'  '.repeat(d)}    Downloading ${hash} via ${gateway}`))
  );

  // Check for existing package
  let oldDeployData: DeploymentInfo | null = null;
  const prevPkg = upgradeFrom || `${name}:${version}`;

  console.log(bold('Checking for existing package...'));
  oldDeployData = await runtime.readDeploy(prevPkg, selectedPreset, runtime.chainId);

  // Update pkgInfo (package.json) with information from existing package, if present
  if (oldDeployData && !wipe) {
    console.log(`${name}:${version}@${preset ? preset : 'main'} (Chain ID: ${chainId}) found`);
    await runtime.restoreMisc(oldDeployData.miscUrl);

    if (!pkgInfo) {
      pkgInfo = oldDeployData.meta;
    }
  } else {
    if (upgradeFrom) {
      throw new Error(`${prevPkg}@${selectedPreset} (Chain ID: ${chainId}) not found`);
    } else {
      console.log(gray(`  ${prevPkg}@${selectedPreset} (Chain ID: ${chainId}) not found`));
    }
  }

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

  console.log('');
  if (oldDeployData && wipe) {
    console.log('Wiping existing package...');
    console.log(bold('Initializing new package...'));
  } else if (oldDeployData && !upgradeFrom) {
    console.log(bold('Continuing with existing package...'));
  } else {
    console.log(bold('Initializing new package...'));
  }
  console.log('Name: ' + cyanBright(`${pkgName}`));
  console.log('Version: ' + cyanBright(`${pkgVersion}`));
  console.log('Preset: ' + cyanBright(`${selectedPreset}`) + (selectedPreset == 'main' ? gray(' (default)') : ''));
  console.log('Chain ID: ' + cyanBright(`${chainId}`));
  if (upgradeFrom) {
    console.log(`Upgrading from: ${cyanBright(upgradeFrom)}`);
  }
  if (publicSourceCode) {
    console.log(gray('Source code will be included in the package'));
  }
  console.log('');

  const providerUrlMsg = providerUrl?.includes(',') ? providerUrl.split(',')[0] : providerUrl;
  console.log(
    bold(
      `Building the chain (ID ${chainId})${
        providerUrlMsg ? ' via ' + providerUrlMsg.replace(RegExp(/[=A-Za-z0-9_-]{32,}/), '*'.repeat(32)) : ''
      }...`
    )
  );

  let defaultSignerAddress: string;
  if (getDefaultSigner) {
    const defaultSigner = await getDefaultSigner!();
    if (defaultSigner) {
      defaultSignerAddress = await defaultSigner.getAddress();
      console.log(`Using ${defaultSignerAddress}`);
    } else {
      console.log();
      console.log(bold(red('Signer not found.')));
      console.log(
        red(
          'Provide a signer to execute this build. Add the --private-key option or set the env variable CANNON_PRIVATE_KEY.'
        )
      );
      process.exit(1);
    }
  }

  if (!_.isEmpty(packageDefinition.settings)) {
    console.log(gray('Overriding the default values for the cannonfile’s settings with the following:'));
    for (const [key, value] of Object.entries(packageDefinition.settings)) {
      console.log(gray(`  - ${key} = ${value}`));
    }
    console.log('');
  }

  if (plugins) {
    const pluginList = await listInstalledPlugins();

    if (pluginList.length) {
      console.log('plugins:', pluginList.join(', '), 'detected');
    }
  }
  console.log('');

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
        yellowBright(
          bold(
            '\n\u26A0\uFE0F  Your deployment was not fully completed. Please inspect the issues listed above and resolve as necessary.'
          )
        )
      );
      console.log(gray(`Total Cost: ${ethers.utils.formatEther(totalCost)} ${nativeCurrencySymbol}`));
      console.log('');
      console.log(
        '- Rerunning the same build command will attempt to execute skipped steps. It will not re-run executed steps.'
      );
      console.log('- To re-run executed steps, add the --wipe flag to the build command.');
      console.log(`- Your partial deployment can be accessed from the URL: ${deployUrl}`);
      console.log('- Run ' + bold(`cannon publish ${deployUrl}`) + ' to pin the partial deployment package on IPFS.');
      console.log(
        '- Use https://usecannon.com/deploy to collect signatures from a Safe for the skipped steps in the partial deployment package.'
      );
    } else {
      const packageRef = `${name}:${version}${selectedPreset != 'main' ? '@' + selectedPreset : ''}`;
      console.log(bold(`💥 ${packageRef} built on ${chainName} (Chain ID: ${chainId})`));
      console.log(gray(`Total Cost: ${ethers.utils.formatEther(totalCost)} ${nativeCurrencySymbol}`));
      console.log('');

      console.log(
        `The following package data has been stored to ${runtime.loaders[runtime.defaultLoaderScheme].getLabel()}`
      );
      console.log(
        table([
          ['Deployment Data', deployUrl],
          ['Package Code', miscUrl],
          ['Metadata', metaUrl],
        ])
      );
      console.log(bold(`Publish ${bold(packageRef)}`));
      console.log(`> ${`cannon publish ${packageRef} --chain-id ${chainId}`}`);
      if (chainId !== 13370) {
        console.log('');
        console.log(bold('Verify contracts on Etherscan'));
        console.log(`> ${`cannon verify ${packageRef} --chain-id ${chainId}`}`);
      }
    }
  } else {
    console.log(
      bold(
        yellow(
          `Chain state could not be saved via ${runtime.loaders[
            runtime.defaultLoaderScheme
          ].getLabel()}. Try a writable endpoint by setting ipfsUrl through \`cannon setup\`.`
        )
      )
    );
  }
  console.log('');

  provider.artifacts = outputs;

  return { outputs, provider };
}
