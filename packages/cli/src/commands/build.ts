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
import chalk from 'chalk';
import fs from 'fs-extra';
import { assign, isEmpty, pick, pickBy } from 'lodash-es';
import path from 'path';
import { table } from 'table';
import * as viem from 'viem';
import pkg from '../../package.json' with { type: 'json' };
import { getChainById } from '../chains.js';
import { filterSettings, saveToMetadataCache } from '../helpers.js';
import { getMainLoader } from '../loader.js';
import { listInstalledPlugins, loadPlugins } from '../plugins.js';
import { createDefaultReadRegistry, createLocalOnlyRegistry, createOnChainOnlyRegistry } from '../registry.js';
import { resolveCliSettings } from '../settings.js';
import { PackageSpecification } from '../types.js';
import { logSpinner, warnSpinner, errorSpinner, logSpinnerEnd } from '../util/console.js';
import { hideApiKey } from '../util/provider.js';
import { createWriteScript, WriteScriptFormat } from '../write-script/write.js';
import { mergeErrors } from '../util/merge-errors.js';

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
    logSpinner(
      chalk.yellowBright(chalk.bold('⚠️ This is a simulation. No changes will be made to the chain. No package data will be saved.\n')),
    );
  }

  let stepsExecuted = false;

  const packageReference = PackageReference.from(
    packageDefinition.name,
    packageDefinition.version,
    packageDefinition.preset,
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

  const onChainOnlyResolver = await createOnChainOnlyRegistry(cliSettings);
  const localOnlyResolver = await createLocalOnlyRegistry(cliSettings);
  const resolver = overrideResolver || (await createDefaultReadRegistry(cliSettings));

  const runtime = new ChainBuilderRuntime(runtimeOptions, resolver, getMainLoader(cliSettings), 'ipfs');

  const dump = writeScript ? await createWriteScript(runtime, writeScript, writeScriptFormat) : null;

  let oldDeployData: DeploymentInfo | null = null;

  // before building, make sure that the name/version isnt already taken on the registry
  const localPackageUrl = await localOnlyResolver.getUrl(fullPackageRef, chainId);
  if (!localPackageUrl.url) {
    const isPackageAlreadyPublished = await onChainOnlyResolver.getUrl(fullPackageRef, chainId);
    if (isPackageAlreadyPublished.url) {
      throw new Error(
        'The package ${fullPackageRef} is already published on the registry. Please bump the `version` field in your cannonfile.',
      );
    }
  }

  if (!wipe) {
    logSpinner(chalk.bold('Checking for existing package...'));

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
        def.getDeployers(),
      );
      if (oldDeployHash) {
        logSpinner(chalk.green(chalk.bold(`Found deployment state via on-chain store: ${oldDeployHash}`)));
        oldDeployData = (await runtime.readBlob(oldDeployHash)) as DeploymentInfo;
      }
    }
  }

  // Update pkgInfo (package.json) with information from existing package, if present
  if (oldDeployData) {
    logSpinner(chalk.gray(`  ${fullPackageRef} (Chain ID: ${chainId}) found`));
    if (!wipe) {
      await runtime.restoreMisc(oldDeployData.miscUrl);
      pkgInfo = pkgInfo || oldDeployData.meta;
    }
  } else {
    logSpinner(chalk.gray('Starting fresh build...'));
  }

  const resolvedSettings = pickBy(assign((!wipe && oldDeployData?.options) || {}, packageDefinition.settings));

  def = def || (oldDeployData ? new ChainDefinition(oldDeployData!.def) : undefined);

  if (!def) {
    throw new Error('no deployment definition to build');
  }

  const initialCtx = await createInitialContext(
    def,
    pkgInfo,
    chainId,
    resolvedSettings,
    getDefaultSigner ? (await getDefaultSigner()).address : viem.zeroAddress,
  );

  const pkgName = name || def.getName(initialCtx);
  const pkgVersion = version || def.getVersion(initialCtx);

  logSpinner('');
  if (oldDeployData && wipe) {
    logSpinner('Wiping existing package...');
    logSpinner(chalk.bold('Initializing new package...'));
    oldDeployData = null;
  } else if (oldDeployData && !upgradeFrom) {
    logSpinner(chalk.bold('Continuing with existing package...'));
  } else {
    logSpinner(chalk.bold('Initializing new package...'));
  }
  logSpinner('Name: ' + chalk.cyanBright(`${pkgName}`));
  logSpinner('Version: ' + chalk.cyanBright(`${pkgVersion}`));
  logSpinner('Preset: ' + chalk.cyanBright(`${preset}`) + (preset == 'main' ? chalk.gray(' (default)') : ''));
  logSpinner('Chain ID: ' + chalk.cyanBright(`${chainId}`));
  if (!privateSourceCode) {
    logSpinner(`Private Source Code: ${chalk.cyanBright('false')} ${chalk.gray('(source code will be included in the package)')}`);
  } else {
    logSpinner(
      `Private Source Code: ${chalk.cyanBright('true')} ${chalk.gray('(source code will not be included in the resulting package)')}`,
    );
  }
  if (upgradeFrom) {
    logSpinner(`Upgrading from: ${chalk.cyanBright(upgradeFrom)}`);
  }
  logSpinner('');

  const rpcUrlMsg =
    provider.transport.type === 'http' ? provider.transport.url : typeof rpcUrl === 'string' ? rpcUrl.split(',')[0] : rpcUrl;

  logSpinner(chalk.bold(`Building the chain (ID ${chainId})${rpcUrlMsg ? ' via ' + hideApiKey(rpcUrlMsg) : ''}...`));

  if (getDefaultSigner) {
    const defaultSigner = await getDefaultSigner();
    logSpinner(`Using ${defaultSigner.address}`);
  }

  if (!isEmpty(resolvedSettings)) {
    logSpinner(chalk.gray('Overriding settings in the cannonfile with the following:'));
    for (const [key, value] of Object.entries(resolvedSettings)) {
      logSpinner(chalk.gray(`  - ${key} = ${value}`));
    }
    logSpinner('');
  }

  if (plugins) {
    const pluginList = await listInstalledPlugins();

    if (pluginList.length) {
      logSpinner('plugins:', pluginList.join(', '), 'detected');
    }
  }
  logSpinner('');

  let partialDeploy = false;
  runtime.on(Events.PreStepExecute, (t, n, _c, d) =>
    logSpinner(chalk.cyanBright(`${'  '.repeat(d)}Executing ${`[${t}.${n}]`}...`)),
  );
  runtime.on(Events.SkipDeploy, (n, err, d) => {
    partialDeploy = true;
    logSpinner(
      chalk.yellowBright(
        `${'  '.repeat(d)}  \u26A0\uFE0F  Skipping [${n}] (${typeof err === 'object' && err.toString === Object.prototype.toString ? JSON.stringify(err) : err.toString()
        })`,
      ),
    );
  });
  runtime.on(Events.Notice, (n, msg) => {
    warnSpinner(chalk.yellowBright(`WARN: ${n}: ${msg}`));
  });
  runtime.on(Events.PostStepExecute, (t, n, c, ctx, o, d) => {
    for (const txnKey in o.txns) {
      const txn = o.txns[txnKey];
      if (c.func) {
        logSpinner(
          `${'  '.repeat(d)}  ${chalk.green('\u2714')} Successfully called ${c.func}(${c?.args
            ?.map((arg: any) => (typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : arg))
            .join(', ')})`,
        );
      } else {
        logSpinner(`${'  '.repeat(d)}  ${chalk.green('\u2714')} Successfully performed operation`);
      }

      logSpinner(chalk.gray(`${'  '.repeat(d)}  Signer: ${txn.signer}`));

      if (c.target) {
        const contractAddress = getContractFromPath(ctx, c.target[0])?.address;
        if (contractAddress) {
          logSpinner(chalk.gray(`${'  '.repeat(d)}  Contract Address: ${contractAddress}`));
        }
      }
      logSpinner(chalk.gray(`${'  '.repeat(d)}  Transaction Hash: ${txn.hash}`));
      const cost = BigInt(txn.gasCost) * BigInt(txn.gasUsed);
      totalCost = totalCost + cost;
      totalGasUsed = totalGasUsed + BigInt(txn.gasUsed);
      logSpinner(
        chalk.gray(
          `${'  '.repeat(d)}  Transaction Cost: ${viem.formatEther(
            cost,
          )} ${nativeCurrencySymbol} (${txn.gasUsed.toLocaleString()} gas)`,
        ),
      );
    }
    for (const contractKey in o.contracts) {
      const contract = o.contracts[contractKey];
      if (contract.deployTxnHash) {
        logSpinner(
          `${'  '.repeat(d)}  ${chalk.green('\u2714')} Successfully deployed ${contract.contractName}${c.create2 ? ' using CREATE2' : ''
          }`,
        );
        logSpinner(chalk.gray(`${'  '.repeat(d)}  Contract Address: ${contract.address}`));
        logSpinner(chalk.gray(`${'  '.repeat(d)}  Transaction Hash: ${contract.deployTxnHash}`));
        const cost = BigInt(contract.gasCost) * BigInt(contract.gasUsed);
        totalCost = totalCost + cost;
        totalGasUsed = totalGasUsed + BigInt(contract.gasUsed);
        logSpinner(
          chalk.gray(
            `${'  '.repeat(d)}  Transaction Cost: ${viem.formatEther(
              cost,
            )} ${nativeCurrencySymbol} (${contract.gasUsed.toLocaleString()} gas)`,
          ),
        );
      }
    }
    for (const setting in o.settings) {
      if (ctx.overrideSettings[setting]) {
        logSpinner(`${'  '.repeat(d)} Setting (Override): ${setting} = ${ctx.overrideSettings[setting]}`);
      } else {
        logSpinner(`${'  '.repeat(d)}  Setting: ${setting} = ${o.settings[setting]}`);
      }
    }
    stepsExecuted = true;

    logSpinner();
  });

  runtime.on(Events.ResolveDeploy, (packageName, preset, chainId, registry, d) =>
    logSpinner(chalk.magenta(`${'  '.repeat(d)}  Resolving ${packageName} (Chain ID: ${chainId}) via ${registry}...`)),
  );
  runtime.on(Events.DownloadDeploy, (hash, gateway, d) =>
    logSpinner(chalk.gray(`${'  '.repeat(d)}    Downloading ${hash} via ${gateway}`)),
  );

  // attach control-c handler
  let ctrlcs = 0;
  const handler = () => {
    if (!runtime.isCancelled()) {
      logSpinner('interrupt received, finishing current operation and cancelling...');
      logSpinner('please be patient, or state loss may occur.');
      partialDeploy = true;
      runtime.cancel();
    } else if (ctrlcs < 4) {
      logSpinner('you really should not try to cancel the build unless you know what you are doing.');
      logSpinner('continue pressing control-c to FORCE, and UNCLEANLY exit cannon');
    } else {
      logSpinner('exiting uncleanly. state loss may have occured. please DO NOT raise bug reports.');
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
      error: pick(buildErr, Object.getOwnPropertyNames(buildErr)),
    };

    const dumpFilePath = path.join(cliSettings.cannonDirectory, 'dumps', new Date().toISOString() + '.json');

    await fs.mkdirp(path.dirname(dumpFilePath));
    await fs.writeJson(dumpFilePath, dumpData, {
      spaces: 2,
    });

    const cliError = new Error(
      `An error occured during build. A file with comprehensive information pertaining to this error has been written to ${dumpFilePath}. Please include this file when reporting an issue.`,
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

    if (!isEmpty(pkgInfo)) {
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
          logSpinner(
            chalk.gray(`Attesting that ${(await runtime.getDefaultSigner({})).address} deployed ${deployUrl} onchain...`),
          );
          await writeUpgradeFromInfo(runtime, packageReference, deployUrl);
          break;
        } catch (err) {
          errorSpinner(err);
          errorSpinner(chalk.red(`Failed to write upgrade record to on-chain state. Try ${i + 1}/3`));
          if (i === 2) {
            errorSpinner(
              chalk.red(
                chalk.bold(
                  `Failed to write state on-chain. The next time you upgrade your package, you should include the option --upgrade-from ${deployUrl}.`,
                ),
              ),
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
      logSpinner(
        chalk.yellowBright(
          chalk.bold(
            '\n\u26A0\uFE0F  Your deployment was not fully completed. Please inspect the issues listed above and resolve as necessary.',
          ),
        ),
      );
      logSpinner(
        chalk.gray(`Total Cost: ${viem.formatEther(totalCost)} ${nativeCurrencySymbol} (${totalGasUsed.toLocaleString()} gas)`),
      );
      logSpinner('');
      logSpinner(
        '- Rerunning the build command will attempt to execute skipped operations. It will not rerun executed operations. (To rerun executed operations, delete the partial build package generated by this run by adding the --wipe flag to the build command on the next run.)',
      );
      if (upgradeFrom) {
        logSpinner(chalk.bold('  Remove the --upgrade-from option to continue from the partial build.'));
      }
      logSpinner(`- Your partial deployment has been stored to ${deployUrl}`);
      logSpinner(
        '- Run ' +
        chalk.bold(`cannon pin ${deployUrl}`) +
        ' to pin the partial deployment package on IPFS. Then use https://usecannon.com/deploy to collect signatures from a Safe for the skipped operations in the partial deployment package.',
      );
    } else {
      if (dryRun) {
        logSpinner(
          chalk.gray(
            `Estimated Total Cost: ${viem.formatEther(
              totalCost,
            )} ${nativeCurrencySymbol} (${totalGasUsed.toLocaleString()} gas)`,
          ),
        );
        logSpinner(chalk.bold(`💥 ${fullPackageRef} would have been successfully built on ${chainName} (Chain ID: ${chainId})`));
      } else {
        if (chainId == 13370) {
          logSpinner(chalk.bold(`💥 ${fullPackageRef} built for Cannon (Chain ID: ${chainId})`));
          logSpinner(chalk.gray('This package can be run locally and cloned in cannonfiles.'));
        } else {
          logSpinner(chalk.bold(`💥 ${fullPackageRef} built on ${chainName} (Chain ID: ${chainId})`));
          logSpinner(
            chalk.gray(
              `Total Cost: ${viem.formatEther(totalCost)} ${nativeCurrencySymbol} (${totalGasUsed.toLocaleString()} gas)`,
            ),
          );
        }
      }
      logSpinner();
      logSpinner(chalk.bold(`These JSON files have been added to ${cliSettings.cannonDirectory}`));
      logSpinner(
        table([
          ['Deployment Data', deployUrl],
          ['Package Code', miscUrl],
          ['Metadata', metaUrl],
        ]),
      );

      if (dryRun) {
        logSpinner(chalk.bold('Inspect the deployment data'));
        logSpinner(`> cannon inspect ${deployUrl}`);
        logSpinner();
        logSpinner(chalk.bold('Upload deployment data to IPFS'));
        logSpinner(`> cannon pin ${deployUrl}`);
      }

      const isMainPreset = preset === PackageReference.DEFAULT_PRESET;

      if (!dryRun) {
        if (isMainPreset) {
          logSpinner(chalk.bold(`Publish ${chalk.bold(`${packageRef}`)} to the registry`));
          logSpinner(`> cannon publish ${packageRef} --chain-id ${chainId}`);
        } else {
          logSpinner(
            chalk.bold(
              `Publish ${chalk.bold(fullPackageRef)} to the registry and pin the IPFS data to ${filteredSettings.publishIpfsUrl}`,
            ),
          );
          logSpinner(`> cannon publish ${fullPackageRef} --chain-id ${chainId}`);
        }

        logSpinner('');
        if (chainId == 13370) {
          logSpinner(chalk.bold('Run this package'));

          if (isMainPreset) logSpinner(`> cannon ${packageRef}`);
          else logSpinner(`> cannon ${fullPackageRef}`);
        } else {
          logSpinner(chalk.bold('Verify contracts on Etherscan'));
          logSpinner(`> cannon verify ${fullPackageRef} --chain-id ${chainId}`);
        }
      }
    }
  } else {
    logSpinner(
      chalk.bold(
        chalk.yellow(
          `Chain state could not be saved via ${runtime.loaders[
            runtime.defaultLoaderScheme
          ].getLabel()}. Try a writable endpoint by setting ipfsUrl through \`cannon setup\`.`,
        ),
      ),
    );
  }

  if (!stepsExecuted) {
    logSpinner(chalk.bold('\nNo operations were executed during the build.'));
  }

  logSpinnerEnd();

  provider = provider.extend(traceActions(outputs) as any);

  return { outputs, provider, runtime, deployInfo };
}
