import {
  build as cannonBuild,
  CANNON_CHAIN_ID,
  CannonRegistry,
  CannonSigner,
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
  findUpgradeFromPackage,
  writeUpgradeFromInfo,
} from '@usecannon/builder';
import { bold, cyanBright, gray, green, magenta, red, yellow, yellowBright } from 'chalk';
import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
import { table } from 'table';
import * as viem from 'viem';
import pkg from '../../package.json';
import { getChainById } from '../chains';
import { filterSettings, saveToMetadataCache } from '../helpers';
import { getMainLoader } from '../loader';
import { listInstalledPlugins, loadPlugins } from '../plugins';
import { createDefaultReadRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { PackageSpecification } from '../types';
import { log, warn, error } from '../util/console';
import { hideApiKey } from '../util/provider';
import { createWriteScript, WriteScriptFormat } from '../write-script/write';
import { mergeErrors } from '../util/merge-errors';

interface Params {
  provider: viem.PublicClient;
  def?: ChainDefinition;
  packageDefinition: PackageSpecification;
  upgradeFrom?: string;
  pkgInfo: any;
  getArtifact?: (name: string) => Promise<ContractArtifact>;
  getSigner: (addr: viem.Address) => Promise<CannonSigner>;
  getDefaultSigner?: () => Promise<CannonSigner>;
  projectDirectory?: string;
  overrideResolver?: CannonRegistry;
  wipe?: boolean;
  dryRun?: boolean;
  skipUpgradeRecord?: false;
  plugins?: boolean;
  privateSourceCode?: boolean;
  rpcUrl?: string;
  registryPriority?: 'local' | 'onchain' | 'offline';
  gasPrice?: bigint;
  gasFee?: bigint;
  priorityGasFee?: bigint;
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
  overrideResolver,
  wipe = false,
  dryRun,
  skipUpgradeRecord = false,
  plugins = true,
  privateSourceCode = false,
  rpcUrl,
  registryPriority,
  gasPrice,
  gasFee,
  priorityGasFee,
  writeScript,
  writeScriptFormat = 'ethers',
}: Params): Promise<{
  outputs: ChainArtifacts;
  provider: viem.PublicClient;
  runtime: ChainBuilderRuntime;
  deployInfo: DeploymentInfo;
}> {
  if (wipe && upgradeFrom) {
    throw new Error('wipe and upgradeFrom are mutually exclusive. Please specify one or the other');
  }

  if (dryRun && rpcUrl) {
    log(
      yellowBright(bold('⚠️ This is a simulation. No changes will be made to the chain. No package data will be saved.\n'))
    );
  }

  let stepsExecuted = false;

  const packageReference = PackageReference.from(
    packageDefinition.name,
    packageDefinition.version,
    packageDefinition.preset
  );

  const { fullPackageRef, packageRef } = packageReference;
  const { name, version, preset } = packageReference;

  const cliSettings = resolveCliSettings({ registryPriority });
  const filteredSettings = await filterSettings(cliSettings);

  if (plugins) {
    await loadPlugins();
  }

  const chainId = await provider.getChainId();
  const chainInfo = getChainById(chainId);
  const chainName = chainInfo?.name || 'unknown chain';
  const nativeCurrencySymbol = chainInfo?.nativeCurrency.symbol || 'ETH';
  let totalCost = BigInt(0);
  let totalGasUsed = BigInt(0);

  const runtimeOptions = {
    provider,
    chainId,
    getArtifact,
    getSigner,
    getDefaultSigner,
    snapshots: chainId === CANNON_CHAIN_ID,
    allowPartialDeploy: chainId !== CANNON_CHAIN_ID,
    // ChainBuilderRuntime uses publicSourceCode to determine if source code should be included in the package
    publicSourceCode: !privateSourceCode,
    gasPrice,
    gasFee,
    priorityGasFee,
  };

  const resolver = overrideResolver || (await createDefaultReadRegistry(cliSettings));

  const runtime = new ChainBuilderRuntime(runtimeOptions, resolver, getMainLoader(cliSettings), 'ipfs');

  const dump = writeScript ? await createWriteScript(runtime, writeScript, writeScriptFormat) : null;

  let oldDeployData: DeploymentInfo | null = null;

  if (!wipe) {
    log(bold('Checking for existing package...'));

    if (upgradeFrom) {
      oldDeployData = await runtime.readDeploy(upgradeFrom, runtime.chainId);
      if (!oldDeployData) {
        throw new Error(`Deployment ${upgradeFrom} (Chain ID: ${chainId}) not found`);
      }
    } else if (def) {
      const oldDeployHash = await findUpgradeFromPackage(
        runtime.registry,
        runtime.provider,
        packageReference,
        runtime.chainId,
        def.getDeployers()
      );
      if (oldDeployHash) {
        log(green(bold(`Found deployment state via on-chain store: ${oldDeployHash}`)));
        oldDeployData = (await runtime.readBlob(oldDeployHash)) as DeploymentInfo;
      }
    }
  }

  // Update pkgInfo (package.json) with information from existing package, if present
  if (oldDeployData) {
    log(gray(`  ${fullPackageRef} (Chain ID: ${chainId}) found`));
    if (!wipe) {
      await runtime.restoreMisc(oldDeployData.miscUrl);
      pkgInfo = pkgInfo || oldDeployData.meta;
    }
  } else {
    log(gray('Starting fresh build...'));
  }

  const resolvedSettings = _.pickBy(_.assign((!wipe && oldDeployData?.options) || {}, packageDefinition.settings));

  def = def || (oldDeployData ? new ChainDefinition(oldDeployData!.def) : undefined);

  if (!def) {
    throw new Error('no deployment definition to build');
  }

  const initialCtx = await createInitialContext(def, pkgInfo, chainId, resolvedSettings);

  const pkgName = name || def.getName(initialCtx);
  const pkgVersion = version || def.getVersion(initialCtx);

  log('');
  if (oldDeployData && wipe) {
    log('Wiping existing package...');
    log(bold('Initializing new package...'));
    oldDeployData = null;
  } else if (oldDeployData && !upgradeFrom) {
    log(bold('Continuing with existing package...'));
  } else {
    log(bold('Initializing new package...'));
  }
  log('Name: ' + cyanBright(`${pkgName}`));
  log('Version: ' + cyanBright(`${pkgVersion}`));
  log('Preset: ' + cyanBright(`${preset}`) + (preset == 'main' ? gray(' (default)') : ''));
  log('Chain ID: ' + cyanBright(`${chainId}`));
  if (!privateSourceCode) {
    log(`Private Source Code: ${cyanBright('false')} ${gray('(source code will be included in the package)')}`);
  } else {
    log(`Private Source Code: ${cyanBright('true')} ${gray('(source code will not be included in the resulting package)')}`);
  }
  if (upgradeFrom) {
    log(`Upgrading from: ${cyanBright(upgradeFrom)}`);
  }
  log('');

  const rpcUrlMsg =
    provider.transport.type === 'http' ? provider.transport.url : typeof rpcUrl === 'string' ? rpcUrl.split(',')[0] : rpcUrl;

  log(bold(`Building the chain (ID ${chainId})${rpcUrlMsg ? ' via ' + hideApiKey(rpcUrlMsg) : ''}...`));

  if (getDefaultSigner) {
    const defaultSigner = await getDefaultSigner();
    log(`Using ${defaultSigner.address}`);
  }

  if (!_.isEmpty(resolvedSettings)) {
    log(gray('Overriding settings in the cannonfile with the following:'));
    for (const [key, value] of Object.entries(resolvedSettings)) {
      log(gray(`  - ${key} = ${value}`));
    }
    log('');
  }

  if (plugins) {
    const pluginList = await listInstalledPlugins();

    if (pluginList.length) {
      log('plugins:', pluginList.join(', '), 'detected');
    }
  }
  log('');

  let partialDeploy = false;
  runtime.on(Events.PreStepExecute, (t, n, _c, d) => log(cyanBright(`${'  '.repeat(d)}Executing ${`[${t}.${n}]`}...`)));
  runtime.on(Events.SkipDeploy, (n, err, d) => {
    partialDeploy = true;
    log(
      yellowBright(
        `${'  '.repeat(d)}  \u26A0\uFE0F  Skipping [${n}] (${
          typeof err === 'object' && err.toString === Object.prototype.toString ? JSON.stringify(err) : err.toString()
        })`
      )
    );
  });
  runtime.on(Events.Notice, (n, msg) => {
    warn(yellowBright(`WARN: ${n}: ${msg}`));
  });
  runtime.on(Events.PostStepExecute, (t, n, c, ctx, o, d) => {
    for (const txnKey in o.txns) {
      const txn = o.txns[txnKey];
      if (c.func) {
        log(
          `${'  '.repeat(d)}  ${green('\u2714')} Successfully called ${c.func}(${c?.args
            ?.map((arg: any) => (typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : arg))
            .join(', ')})`
        );
      } else {
        log(`${'  '.repeat(d)}  ${green('\u2714')} Successfully performed operation`);
      }

      log(gray(`${'  '.repeat(d)}  Signer: ${txn.signer}`));

      if (c.target) {
        const contractAddress = getContractFromPath(ctx, c.target[0])?.address;
        if (contractAddress) {
          log(gray(`${'  '.repeat(d)}  Contract Address: ${contractAddress}`));
        }
      }
      log(gray(`${'  '.repeat(d)}  Transaction Hash: ${txn.hash}`));
      const cost = BigInt(txn.gasCost) * BigInt(txn.gasUsed);
      totalCost = totalCost + cost;
      totalGasUsed = totalGasUsed + BigInt(txn.gasUsed);
      log(
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
        log(
          `${'  '.repeat(d)}  ${green('\u2714')} Successfully deployed ${contract.contractName}${
            c.create2 ? ' using CREATE2' : ''
          }`
        );
        log(gray(`${'  '.repeat(d)}  Contract Address: ${contract.address}`));
        log(gray(`${'  '.repeat(d)}  Transaction Hash: ${contract.deployTxnHash}`));
        const cost = BigInt(contract.gasCost) * BigInt(contract.gasUsed);
        totalCost = totalCost + cost;
        totalGasUsed = totalGasUsed + BigInt(contract.gasUsed);
        log(
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
        log(`${'  '.repeat(d)} Setting (Override): ${setting} = ${ctx.overrideSettings[setting]}`);
      } else {
        log(`${'  '.repeat(d)}  Setting: ${setting} = ${o.settings[setting]}`);
      }
    }
    stepsExecuted = true;

    log();
  });

  runtime.on(Events.ResolveDeploy, (packageName, preset, chainId, registry, d) =>
    log(magenta(`${'  '.repeat(d)}  Resolving ${packageName} (Chain ID: ${chainId}) via ${registry}...`))
  );
  runtime.on(Events.DownloadDeploy, (hash, gateway, d) =>
    log(gray(`${'  '.repeat(d)}    Downloading ${hash} via ${gateway}`))
  );

  // attach control-c handler
  let ctrlcs = 0;
  const handler = () => {
    if (!runtime.isCancelled()) {
      log('interrupt received, finishing current operation and cancelling...');
      log('please be patient, or state loss may occur.');
      partialDeploy = true;
      runtime.cancel();
    } else if (ctrlcs < 4) {
      log('you really should not try to cancel the build unless you know what you are doing.');
      log('continue pressing control-c to FORCE, and UNCLEANLY exit cannon');
    } else {
      log('exiting uncleanly. state loss may have occured. please DO NOT raise bug reports.');
      process.exit(1234);
    }
    ctrlcs++;
  };
  if (!dryRun && chainId != CANNON_CHAIN_ID) {
    process.on('SIGINT', handler);
    process.on('SIGTERM', handler);
    process.on('SIGQUIT', handler);
  }

  let newState;
  try {
    newState = await cannonBuild(runtime, def, oldDeployData && !wipe ? oldDeployData.state : {}, initialCtx);
  } catch (buildErr: any) {
    const dumpData = {
      def: def.toJson(),
      initialCtx,
      oldState: oldDeployData?.state || null,
      activeCtx: runtime.ctx,
      error: _.pick(buildErr, Object.getOwnPropertyNames(buildErr)),
    };

    const dumpFilePath = path.join(cliSettings.cannonDirectory, 'dumps', new Date().toISOString() + '.json');

    await fs.mkdirp(path.dirname(dumpFilePath));
    await fs.writeJson(dumpFilePath, dumpData, {
      spaces: 2,
    });

    const cliError = new Error(
      `An error occured during build. A file with comprehensive information pertaining to this error has been written to ${dumpFilePath}. Please include this file when reporting an issue.`
    );

    throw mergeErrors(cliError, buildErr);
  }

  if (writeScript) {
    await dump!.end();
  }

  const outputs = (await getOutputs(runtime, def, newState))!;

  // save the state to ipfs
  const miscUrl = await runtime.recordMisc();

  const chainDef = def.toJson();

  chainDef.version = pkgVersion;

  const deployInfo = {
    generator: `cannon cli ${pkg.version}`,
    timestamp: Math.floor(Date.now() / 1000),
    def: chainDef,
    state: newState,
    seq: oldDeployData?.seq ? oldDeployData.seq + 1 : 1,
    track: oldDeployData?.track || Math.random().toString(36).substring(2, 15),
    options: resolvedSettings,
    status: partialDeploy ? 'partial' : 'complete',
    meta: pkgInfo,
    miscUrl: miscUrl || '',
    chainId: runtime.chainId,
  } satisfies DeploymentInfo;

  if (miscUrl) {
    const deployUrl = (await runtime.putDeploy(deployInfo)) as string;

    const metadataCache: { [key: string]: string } = {};

    if (!_.isEmpty(pkgInfo)) {
      metadataCache.gitUrl = pkgInfo.gitUrl;
      metadataCache.commitHash = pkgInfo.commitHash;
      metadataCache.readme = pkgInfo.readme;
    }

    // store metadata to /metadata_cache folder
    const metadata = await saveToMetadataCache(`${pkgName}_${pkgVersion}_${runtime.chainId}-${preset}`, metadataCache);

    const metaUrl = await runtime.putBlob(metadata);

    // write upgrade-from info on-chain
    if (stepsExecuted && !dryRun && !skipUpgradeRecord) {
      for (let i = 0; i < 3; i++) {
        try {
          log(gray(`Attesting that ${(await runtime.getDefaultSigner({})).address} deployed ${deployUrl} onchain...`));
          await writeUpgradeFromInfo(runtime, packageReference, deployUrl);
          break;
        } catch (err) {
          error(err);
          error(red(`Failed to write upgrade record to on-chain state. Try ${i + 1}/3`));
          if (i === 2) {
            error(
              red(
                bold(
                  `Failed to write state on-chain. The next time you upgrade your package, you should include the option --upgrade-from ${deployUrl}.`
                )
              )
            );
          }
        }
      }
    }

    await resolver.publish([fullPackageRef, `${name}:latest@${preset}`], runtime.chainId, deployUrl!, metaUrl!);

    // detach the process handler
    process.off('SIGINT', handler);
    process.off('SIGTERM', handler);
    process.off('SIGQUIT', handler);

    if (partialDeploy) {
      log(
        yellowBright(
          bold(
            '\n\u26A0\uFE0F  Your deployment was not fully completed. Please inspect the issues listed above and resolve as necessary.'
          )
        )
      );
      log(gray(`Total Cost: ${viem.formatEther(totalCost)} ${nativeCurrencySymbol} (${totalGasUsed.toLocaleString()} gas)`));
      log('');
      log(
        '- Rerunning the build command will attempt to execute skipped operations. It will not rerun executed operations. (To rerun executed operations, delete the partial build package generated by this run by adding the --wipe flag to the build command on the next run.)'
      );
      if (upgradeFrom) {
        log(bold('  Remove the --upgrade-from option to continue from the partial build.'));
      }
      log(`- Your partial deployment has been stored to ${deployUrl}`);
      log(
        '- Run ' +
          bold(`cannon pin ${deployUrl}`) +
          ' to pin the partial deployment package on IPFS. Then use https://usecannon.com/deploy to collect signatures from a Safe for the skipped operations in the partial deployment package.'
      );
    } else {
      if (dryRun) {
        log(
          gray(
            `Estimated Total Cost: ${viem.formatEther(
              totalCost
            )} ${nativeCurrencySymbol} (${totalGasUsed.toLocaleString()} gas)`
          )
        );
        log(bold(`💥 ${fullPackageRef} would have been successfully built on ${chainName} (Chain ID: ${chainId})`));
      } else {
        if (chainId == 13370) {
          log(bold(`💥 ${fullPackageRef} built for Cannon (Chain ID: ${chainId})`));
          log(gray('This package can be run locally and cloned in cannonfiles.'));
        } else {
          log(bold(`💥 ${fullPackageRef} built on ${chainName} (Chain ID: ${chainId})`));
          log(
            gray(`Total Cost: ${viem.formatEther(totalCost)} ${nativeCurrencySymbol} (${totalGasUsed.toLocaleString()} gas)`)
          );
        }
      }
      log();
      log(bold(`These JSON files have been added to ${cliSettings.cannonDirectory}`));
      log(
        table([
          ['Deployment Data', deployUrl],
          ['Package Code', miscUrl],
          ['Metadata', metaUrl],
        ])
      );

      if (dryRun) {
        log(bold('Inspect the deployment data'));
        log(`> cannon inspect ${deployUrl}`);
        log();
        log(bold('Upload deployment data to IPFS'));
        log(`> cannon pin ${deployUrl}`);
      }

      const isMainPreset = preset === PackageReference.DEFAULT_PRESET;

      if (!dryRun) {
        if (isMainPreset) {
          log(bold(`Publish ${bold(`${packageRef}`)} to the registry`));
          log(`> cannon publish ${packageRef} --chain-id ${chainId}`);
        } else {
          log(
            bold(
              `Publish ${bold(fullPackageRef)} to the registry and pin the IPFS data to ${filteredSettings.publishIpfsUrl}`
            )
          );
          log(`> cannon publish ${fullPackageRef} --chain-id ${chainId}`);
        }

        log('');
        if (chainId == 13370) {
          log(bold('Run this package'));

          if (isMainPreset) log(`> cannon ${packageRef}`);
          else log(`> cannon ${fullPackageRef}`);
        } else {
          log(bold('Verify contracts on Etherscan'));
          log(`> cannon verify ${fullPackageRef} --chain-id ${chainId}`);
        }
      }
    }
  } else {
    log(
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
    log(bold('\nNo operations were executed during the build.'));
  }

  log('');

  provider = provider.extend(traceActions(outputs) as any);

  return { outputs, provider, runtime, deployInfo };
}
