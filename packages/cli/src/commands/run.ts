import {
  CANNON_CHAIN_ID,
  CannonRegistry,
  CannonSigner,
  ChainArtifacts,
  ChainBuilderRuntime,
  ChainDefinition,
  ContractArtifact,
  getOutputs,
  PackageReference,
  renderTrace,
  TraceEntry,
} from '@usecannon/builder';
import chalk from 'chalk';
import { entries, fromPairs, map } from 'lodash-es';
import * as viem from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ANVIL_FIRST_ADDRESS } from '../constants.js';
import { ensureFoundryCompatibility } from '../helpers.js';
import { getMainLoader } from '../loader.js';
import { createDefaultReadRegistry } from '../registry.js';
import { CannonRpcNode, getProvider } from '../rpc.js';
import { resolveCliSettings } from '../settings.js';
import { PackageSpecification } from '../types.js';
import { logSpinner, warnSpinner, logSpinnerStart, logSpinnerEnd } from '../util/console.js';
import { getContractsRecursive } from '../util/contracts-recursive.js';
import onKeypress from '../util/on-keypress.js';
import { build } from './build.js';
import { interact } from './interact.js';

export interface RunOptions {
  node: CannonRpcNode;
  resolver?: CannonRegistry;
  logs?: boolean;
  pkgInfo: any;
  impersonate: string;
  mnemonic?: string;
  privateKey?: viem.Hash;
  upgradeFrom?: string;
  getArtifact?: (name: string) => Promise<ContractArtifact>;
  getSigner: (addr: viem.Address) => Promise<CannonSigner>;
  getDefaultSigner: () => Promise<CannonSigner>;
  registryPriority: 'local' | 'onchain' | 'offline';
  fundAddresses?: string[];
  helpInformation?: string;
  build?: boolean;
  nonInteractive?: boolean;
}

const INITIAL_INSTRUCTIONS = chalk.green(`Press ${chalk.bold('h')} to see help information for this command.`);
const INSTRUCTIONS = chalk.green(
  `Press ${chalk.bold('a')} to toggle displaying the logs from your local node.\nPress ${chalk.bold(
    'i',
  )} to interact with contracts via the command line.\nPress ${chalk.bold(
    'v',
  )} to toggle display verbosity of transaction traces as they run.`,
);

export async function run(packages: PackageSpecification[], options: RunOptions): Promise<void> {
  // ensure foundry compatibility
  await ensureFoundryCompatibility();

  // Start the rpc server
  const node = options.node;

  const provider = getProvider(node)!;
  const nodeLogging = await createLoggingInterface(node);

  if (options.fundAddresses && options.fundAddresses.length) {
    for (const fundAddress of options.fundAddresses) {
      await provider?.setBalance({ address: fundAddress as viem.Address, value: viem.parseEther('10000') });
    }
  }

  const cliSettings = resolveCliSettings(options);

  const resolver = options.resolver || (await createDefaultReadRegistry(cliSettings));

  const buildOutputs: { pkg: PackageSpecification; outputs: ChainArtifacts }[] = [];

  const signers: CannonSigner[] = [];

  // set up signers

  const accounts = cliSettings.privateKey
    ? cliSettings.privateKey.split(',').map((pk) => privateKeyToAccount(pk as viem.Hex).address)
    : (options.impersonate || ANVIL_FIRST_ADDRESS).split(',');

  for (const addr of accounts) {
    await provider.impersonateAccount({ address: addr as viem.Address });
    await provider.setBalance({ address: addr as viem.Address, value: viem.parseEther('10000') });
    signers.push({ address: addr as viem.Address, wallet: provider });
  }

  const chainId = await provider.getChainId();

  const basicRuntime = new ChainBuilderRuntime(
    {
      provider: provider,
      chainId,
      async getSigner(addr: viem.Address) {
        // on test network any user can be conjured
        await provider.impersonateAccount({ address: addr });
        await provider.setBalance({ address: addr, value: viem.parseEther('10000') });
        return { address: addr, wallet: provider };
      },
      snapshots: chainId === CANNON_CHAIN_ID,
      allowPartialDeploy: false,
    },
    resolver,
    getMainLoader(cliSettings),
  );

  for (const pkg of packages) {
    const { name, version, preset } = pkg;
    const { fullPackageRef } = PackageReference.from(name, version, preset);

    if (options.build || (pkg.settings && Object.keys(pkg.settings).length > 0)) {
      const { outputs } = await build({
        ...options,
        packageDefinition: pkg,
        provider,
        overrideResolver: resolver,
        upgradeFrom: options.upgradeFrom,
        dryRun: true,
      });

      buildOutputs.push({ pkg, outputs });
    } else {
      // just get outputs
      const deployData = await basicRuntime.readDeploy(fullPackageRef, basicRuntime.chainId);

      if (!deployData) {
        throw new Error(
          `deployment not found: ${fullPackageRef}. please make sure it exists for the network ${basicRuntime.chainId}`,
        );
      }

      const outputs = await getOutputs(basicRuntime, new ChainDefinition(deployData.def), deployData.state);

      if (!outputs) {
        throw new Error(`no cannon build found for chain ${basicRuntime.chainId}/${preset}. Did you mean to run instead?`);
      }

      buildOutputs.push({ pkg, outputs });
    }

    logSpinner(chalk.greenBright(`${chalk.bold(`${name}:${version}@${preset}`)} has been deployed to a local node.`));

    if (node.forkProvider) {
      logSpinner(chalk.gray('Running from fork provider'));
    }
  }

  if (!signers.length) {
    warnSpinner(
      chalk.yellow(
        '\nWARNING: no signers resolved. Specify signers with --mnemonic or --private-key (or use --impersonate if on a fork).',
      ),
    );
  }

  if (options.logs) {
    await new Promise(() => {
      logSpinner('Displaying node logs.....');
      nodeLogging.enable();
    });
  }
  const mergedOutputs =
    buildOutputs.length == 1
      ? buildOutputs[0].outputs
      : ({
          imports: fromPairs(entries(map(buildOutputs, 'outputs'))),
        } as ChainArtifacts);

  let traceLevel = 0;

  async function debugTracing(blockInfo: viem.Block) {
    if (traceLevel == 0) {
      return;
    }
    const bwt = await provider.getBlock({ blockNumber: blockInfo.number!, includeTransactions: true });

    for (const txn of bwt.transactions) {
      try {
        const traces = (await provider.request({
          method: 'trace_transaction' as any,
          params: [txn.hash],
        })) as TraceEntry[];

        let renderedTrace = renderTrace(mergedOutputs, traces);

        if (traceLevel === 1) {
          // only show lines containing `log`s, and prettify
          renderedTrace = renderedTrace
            .split('\n')
            .filter((l) => l.includes('logSpinner('))
            .map((l) => l.trim())
            .join('\n');
        }

        if (renderedTrace) {
          logSpinner(`trace: ${txn.hash}`);
          logSpinner(renderedTrace);
          logSpinner();
        }
      } catch (err) {
        logSpinner('could not render trace for transaction:', err);
      }
    }
  }

  // TODO: once again types from docs do not work here for some reason
  provider.watchBlocks({ onBlock: debugTracing as any });

  if (options.nonInteractive) {
    await new Promise(() => {
      logSpinner(chalk.gray('Non-interactive mode enabled. Press Ctrl+C to exit.'));
    });
  } else {
    logSpinner();
    logSpinner(INITIAL_INSTRUCTIONS);
    logSpinner(INSTRUCTIONS);

    logSpinnerEnd();
    await onKeypress(async (evt, { pause, stop }) => {
      if (evt.ctrl && evt.name === 'c') {
        stop();
        process.exit();
      } else if (evt.name === 'a') {
        logSpinnerStart();
        // Toggle showAnvilLogs when the user presses "a"
        if (nodeLogging.enabled()) {
          logSpinner(chalk.gray('Paused anvil logs...'));
          logSpinner(INSTRUCTIONS);
          logSpinnerEnd();
          nodeLogging.disable();
        } else {
          logSpinner(chalk.gray('Unpaused anvil logs...'));
          logSpinnerEnd();
          nodeLogging.enable();
        }
      } else if (evt.name === 'i') {
        logSpinnerEnd();
        if (nodeLogging.enabled()) return;

        await pause(async () => {
          const [signer] = signers;

          const contracts = buildOutputs.map((info) => getContractsRecursive(info.outputs));

          await interact({
            packages,
            packagesArtifacts: buildOutputs.map((info) => info.outputs),
            contracts,
            signer,
            provider,
          });
        });
        logSpinnerStart();

        logSpinner(INITIAL_INSTRUCTIONS);
        logSpinner(INSTRUCTIONS);
        logSpinnerEnd();
      } else if (evt.name == 'v') {
        logSpinnerStart();
        // Toggle showAnvilLogs when the user presses "a"
        if (traceLevel === 0) {
          traceLevel = 1;
          logSpinner(chalk.gray('Enabled display of log events from transactions...'));
        } else if (traceLevel === 1) {
          traceLevel = 2;
          logSpinner(chalk.gray('Enabled display of full transaction logs...'));
        } else {
          traceLevel = 0;
          logSpinner(chalk.gray('Disabled transaction tracing...'));
        }
        logSpinnerEnd();
      } else if (evt.name === 'h') {
        logSpinnerStart();
        if (nodeLogging.enabled()) return;

        if (options.helpInformation) logSpinner('\n' + options.helpInformation);
        logSpinner();
        logSpinner(INSTRUCTIONS);
        logSpinnerEnd();
      }
    });
  }
}

async function createLoggingInterface(node: CannonRpcNode) {
  let enabled = false;
  let outputBuffer = '';
  node.stdout!.on('data', (rawChunk) => {
    const chunk = rawChunk.toString('utf8');
    const newData = chunk
      .split('\n')
      .map((m: string) => {
        return chalk.gray('anvil: ') + m;
      })
      .join('\n');

    if (enabled) {
      logSpinner(newData);
    } else {
      outputBuffer += '\n' + newData;
    }
  });

  const logging = {
    enabled: () => enabled,

    enable: () => {
      if (outputBuffer) {
        logSpinner(outputBuffer);
        outputBuffer = '';
      }

      enabled = true;
    },

    disable: () => {
      enabled = false;
    },
  };

  return logging;
}
