import {
  build as cannonBuild,
  CANNON_CHAIN_ID,
  CannonRegistry,
  ChainArtifacts,
  ChainBuilderRuntime,
  ChainDefinition,
  ContractArtifact,
  createInitialContext,
  DeploymentInfo,
  Events,
  getContractFromPath,
  getOutputs,
  PackageReference,
  traceActions,
} from '@usecannon/builder';
import { CannonSigner } from '@usecannon/builder/src';
import { bold, cyanBright, gray, green, magenta, red, yellow, yellowBright } from 'chalk';
import _ from 'lodash';
import { table } from 'table';
import * as viem from 'viem';
import pkg from '../../package.json';
import { getChainById } from '../chains';
import { readMetadataCache } from '../helpers';
import { getMainLoader } from '../loader';
import { listInstalledPlugins, loadPlugins } from '../plugins';
import { createDefaultReadRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { PackageSpecification } from '../types';
import { createWriteScript, WriteScriptFormat } from '../write-script/write';

interface Params {
  provider: viem.PublicClient;
  def?: ChainDefinition;
  packageDefinition: PackageSpecification;
  upgradeFrom?: string;
  pkgInfo: any;

  getArtifact?: (name: string) => Promise<ContractArtifact>;
  getSigner?: (addr: viem.Address) => Promise<CannonSigner>;
  getDefaultSigner?: () => Promise<CannonSigner>;
  projectDirectory?: string;
  presetArg?: string;
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
  writeScript?: string;
  writeScriptFormat?: WriteScriptFormat;
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
  writeScript,
  writeScriptFormat = 'ethers',
}: Params): Promise<{ outputs: ChainArtifacts; provider: viem.PublicClient; runtime: ChainBuilderRuntime }> {
  if (wipe && upgradeFrom) {
    throw new Error('wipe and upgradeFrom are mutually exclusive. Please specify one or the other');
  }

  if (!persist && providerUrl) {
    console.log(
      yellowBright(bold('⚠️  This is a simulation. No changes will be made to the chain. No package data will be saved.\n'))
    );
  }

  let stepsExecuted = false;
  const packageRef = PackageReference.from(packageDefinition.name, packageDefinition.version, packageDefinition.preset);

  const { name, version } = packageRef;
  let { preset } = packageRef;

  // Handle deprecated preset specification
  if (presetArg) {
    console.warn(
      yellow(
        bold(
          'The --preset option will be deprecated soon. Reference presets in the package reference using the format name:version@preset'
        )
      )
    );
    preset = presetArg;
  }

  const { fullPackageRef } = packageRef;

  let pkgName = name;
  let pkgVersion = version;

  const cliSettings = resolveCliSettings({ registryPriority });

  if (plugins) {
    await loadPlugins();
  }

  const chainId = await provider.getChainId();
  const chainInfo = getChainById(chainId);
  const chainName = chainInfo?.name || 'unknown chain';
  const nativeCurrencySymbol = chainInfo?.nativeCurrency.symbol || 'ETH';
  let totalCost = BigInt(0);

  const runtimeOptions = {
    provider,
    chainId,
    getArtifact,
    getSigner:
      getSigner ||
      async function (addr: viem.Address) {
        // on test network any user can be conjured
        await (provider as unknown as viem.TestClient).impersonateAccount({ address: addr });
        await (provider as unknown as viem.TestClient).setBalance({ address: addr, value: viem.parseEther('10000') });

        return {
          address: addr,
          wallet: viem.createWalletClient({
            account: addr,
            chain: provider.chain,
            transport: viem.custom(provider.transport),
          }),
        };
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

  const runtime = new ChainBuilderRuntime(runtimeOptions, resolver, getMainLoader(cliSettings), 'ipfs');

  const dump = writeScript ? await createWriteScript(runtime, writeScript, writeScriptFormat) : null;

  // Check for existing package
  let oldDeployData: DeploymentInfo | null = null;
  const prevPkg = upgradeFrom || fullPackageRef;

  console.log(bold('Checking for existing package...'));
  oldDeployData = await runtime.readDeploy(prevPkg, runtime.chainId);

  // Update pkgInfo (package.json) with information from existing package, if present
  if (oldDeployData) {
    console.log(gray(`    ${fullPackageRef} (Chain ID: ${chainId}) found`));
    if (!wipe) {
      await runtime.restoreMisc(oldDeployData.miscUrl);

      if (!pkgInfo) {
        pkgInfo = oldDeployData.meta;
      }
    }
  } else {
    if (upgradeFrom) {
      throw new Error(`    ${prevPkg} (Chain ID: ${chainId}) not found`);
    } else {
      console.log(gray(`    ${prevPkg} (Chain ID: ${chainId}) not found`));
    }
  }

  const resolvedSettings = _.pickBy(_.assign((!wipe && oldDeployData?.options) || {}, packageDefinition.settings));

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
  console.log('Preset: ' + cyanBright(`${preset}`) + (preset == 'main' ? gray(' (default)') : ''));
  console.log('Chain ID: ' + cyanBright(`${chainId}`));
  if (upgradeFrom) {
    console.log(`Upgrading from: ${cyanBright(upgradeFrom)}`);
  }
  if (publicSourceCode) {
    console.log(gray('Source code will be included in the package'));
  }
  console.log('');

  const providerUrlMsg =
    provider.transport.type === 'http'
      ? provider.transport.url
      : typeof providerUrl === 'string'
      ? providerUrl.split(',')[0]
      : providerUrl;
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
      defaultSignerAddress = defaultSigner.address;
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

  if (!_.isEmpty(resolvedSettings)) {
    console.log(gray('Overriding settings in the cannonfile with the following:'));
    for (const [key, value] of Object.entries(resolvedSettings)) {
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
  runtime.on(Events.PostStepExecute, (t, n, c, ctx, o, d) => {
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
      const cost = BigInt(txn.gasCost) * BigInt(txn.gasUsed);
      totalCost = totalCost + cost;
      console.log(
        gray(
          `${'  '.repeat(d)}  Transaction Cost: ${viem.formatEther(
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
        const cost = BigInt(contract.gasCost) * BigInt(contract.gasUsed);
        totalCost = totalCost + cost;
        console.log(
          gray(
            `${'  '.repeat(d)}  Transaction Cost: ${viem.formatEther(
              cost
            )} ${nativeCurrencySymbol} (${contract.gasUsed.toLocaleString()} gas)`
          )
        );
      }
    }
    for (const setting in o.settings) {
      if (ctx.overrideSettings[setting]) {
        console.log(red(`${'  '.repeat(d)}  Overridden Setting: ${setting} = ${ctx.overrideSettings[setting]}`));
      } else {
        console.log(gray(`${'  '.repeat(d)}  Setting: ${setting} = ${o.settings[setting]}`));
      }
    }
    stepsExecuted = true;

    console.log();
  });

  runtime.on(Events.ResolveDeploy, (packageName, preset, chainId, registry, d) =>
    console.log(magenta(`${'  '.repeat(d)}  Resolving ${packageName} (Chain ID: ${chainId}) via ${registry}...`))
  );
  runtime.on(Events.DownloadDeploy, (hash, gateway, d) =>
    console.log(gray(`${'  '.repeat(d)}    Downloading ${hash} via ${gateway}`))
  );

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
  if (persist && chainId != CANNON_CHAIN_ID) {
    process.on('SIGINT', handler);
    process.on('SIGTERM', handler);
    process.on('SIGQUIT', handler);
  }

  const newState = await cannonBuild(runtime, def, oldDeployData && !wipe ? oldDeployData.state : {}, initialCtx);

  if (writeScript) {
    await dump!.end();
  }

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
    await resolver.publish([fullPackageRef, `${name}:latest@${preset}`], runtime.chainId, deployUrl!, metaUrl!);

    // detach the process handler

    process.off('SIGINT', handler);
    process.off('SIGTERM', handler);
    process.off('SIGQUIT', handler);

    if (partialDeploy) {
      console.log(
        yellowBright(
          bold(
            '\n\u26A0\uFE0F  Your deployment was not fully completed. Please inspect the issues listed above and resolve as necessary.'
          )
        )
      );
      console.log(gray(`Total Cost: ${viem.formatEther(totalCost)} ${nativeCurrencySymbol}`));
      console.log('');
      console.log(
        '- Rerunning the build command will attempt to execute skipped steps. It will not rerun executed steps. (To rerun executed steps, delete the partial build package generated by this run by adding the --wipe flag to the build command on the next run.)'
      );
      if (upgradeFrom) {
        console.log(bold('  Remove the --upgrade-from option to continue from the partial build.'));
      }
      console.log(`- Your partial deployment has been stored to ${deployUrl}`);
      console.log(
        '- Run ' +
          bold(`cannon pin ${deployUrl}`) +
          ' to pin the partial deployment package on IPFS. Then use https://usecannon.com/deploy to collect signatures from a Safe for the skipped steps in the partial deployment package.'
      );
    } else {
      if (chainId == 13370) {
        console.log(bold(`💥 ${fullPackageRef} built for Cannon (Chain ID: ${chainId})`));
        console.log(gray('This package can be run locally using the CLI and provisioned by Cannonfiles.'));
      } else {
        console.log(bold(`💥 ${fullPackageRef} built on ${chainName} (Chain ID: ${chainId})`));
        console.log(gray(`Total Cost: ${viem.formatEther(totalCost)} ${nativeCurrencySymbol}`));
      }
      console.log();

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
      console.log(bold(`Publish ${bold(fullPackageRef)}`));
      console.log(`> ${`cannon publish ${fullPackageRef} --chain-id ${chainId}`}`);
      console.log('');
      if (chainId == 13370) {
        console.log(bold('Run this package'));
        console.log(`> ${`cannon ${fullPackageRef}`}`);
      } else {
        console.log(bold('Verify contracts on Etherscan'));
        console.log(`> ${`cannon verify ${fullPackageRef} --chain-id ${chainId}`}`);
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

  if (!stepsExecuted) {
    console.log(bold('No steps were executed during the build.'));
  }

  console.log('');

  provider = provider.extend(traceActions(outputs) as any);

  return { outputs, provider, runtime };
}
