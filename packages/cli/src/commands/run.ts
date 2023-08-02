import { greenBright, green, bold, gray, yellow } from 'chalk';
import { ethers } from 'ethers';
import {
  CANNON_CHAIN_ID,
  ChainArtifacts,
  ChainBuilderRuntime,
  ChainDefinition,
  ContractArtifact,
  getOutputs,
} from '@usecannon/builder';
import { PackageSpecification } from '../types';
import { CannonRpcNode, getProvider } from '../rpc';
import { interact } from '../interact';
import onKeypress from '../util/on-keypress';
import { build } from './build';
import { getContractsRecursive } from '../util/contracts-recursive';
import { createDefaultReadRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { setupAnvil } from '../helpers';
import { getMainLoader } from '../loader';

export interface RunOptions {
  node: CannonRpcNode;
  logs?: boolean;
  pkgInfo: any;
  preset: string;
  impersonate: string;
  mnemonic?: string;
  privateKey?: string;
  upgradeFrom?: string;
  getArtifact?: (name: string) => Promise<ContractArtifact>;
  fundAddresses?: string[];
  helpInformation?: string;
  build?: boolean;
}

const INITIAL_INSTRUCTIONS = green(`Press ${bold('h')} to see help information for this command.`);
const INSTRUCTIONS = green(
  `Press ${bold('a')} to toggle displaying the logs from your local node.\nPress ${bold(
    'i'
  )} to interact with contracts via the command line.`
);

export async function run(packages: PackageSpecification[], options: RunOptions) {
  await setupAnvil();
  console.log(bold('Starting local node...\n'));

  // Start the rpc server
  const node = options.node;
  const provider = await getProvider(node);
  const nodeLogging = await createLoggingInterface(node);

  if (options.fundAddresses && options.fundAddresses.length) {
    for (const fundAddress of options.fundAddresses) {
      await provider.send('hardhat_setBalance', [fundAddress, `0x${(1e22).toString(16)}`]);
    }
  }

  const cliSettings = resolveCliSettings();

  const resolver = await createDefaultReadRegistry(cliSettings);

  const buildOutputs: { pkg: PackageSpecification; outputs: ChainArtifacts }[] = [];

  let signers: ethers.Signer[] = [];

  // set up signers
  for (const addr of (options.impersonate || '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266').split(',')) {
    await provider.send('hardhat_impersonateAccount', [addr]);
    await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
    signers = [provider.getSigner(addr)];
  }

  const chainId = (await provider.getNetwork()).chainId;

  const basicRuntime = new ChainBuilderRuntime(
    {
      provider: provider,
      chainId,
      async getSigner(addr: string) {
        // on test network any user can be conjured
        await provider.send('hardhat_impersonateAccount', [addr]);
        await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
        return provider.getSigner(addr);
      },
      snapshots: chainId === CANNON_CHAIN_ID,
      allowPartialDeploy: false,
    },
    resolver,
    getMainLoader(cliSettings)
  );

  for (const pkg of packages) {
    const { name, version } = pkg;
    if (options.build || Object.keys(pkg.settings).length) {
      const { outputs } = await build({
        ...options,
        packageDefinition: pkg,
        provider,
        overrideResolver: resolver,
        preset: options.preset,
        upgradeFrom: options.upgradeFrom,
        persist: false,
      });

      buildOutputs.push({ pkg, outputs });
    } else {
      // just get outputs
      const deployData = await basicRuntime.readDeploy(`${pkg.name}:${pkg.version}`, options.preset, basicRuntime.chainId);

      if (!deployData) {
        throw new Error(
          `deployment not found: ${name}:${version}. please make sure it exists for the ${options.preset} preset and network ${basicRuntime.chainId}`
        );
      }

      const outputs = await getOutputs(basicRuntime, new ChainDefinition(deployData.def), deployData.state);

      if (!outputs) {
        throw new Error(
          `no cannon build found for chain ${basicRuntime.chainId}/${options.preset}. Did you mean to run instead?`
        );
      }

      buildOutputs.push({ pkg, outputs });
    }

    console.log(
      greenBright(
        `${bold(`${name}:${version}`)} has been deployed to a local node running at ${bold('localhost:' + node.port)}`
      )
    );

    if (node.forkProvider) {
      console.log(gray('Running from fork provider'));
    }
  }

  if (!signers.length) {
    console.warn(
      yellow(
        '\nWARNING: no signers resolved. Specify signers with --mnemonic or --private-key (or use --impersonate if on a fork).'
      )
    );
  }

  if (options.logs) {
    return {
      signers,
      outputs: buildOutputs,
      provider,
      node,
    };
  }

  console.log();

  console.log(INITIAL_INSTRUCTIONS);
  console.log(INSTRUCTIONS);

  await onKeypress(async (evt, { pause, stop }) => {
    if (evt.ctrl && evt.name === 'c') {
      stop();
      process.exit();
    } else if (evt.name === 'a') {
      // Toggle showAnvilLogs when the user presses "a"
      if (nodeLogging.enabled()) {
        console.log(gray('Paused anvil logs...'));
        console.log(INSTRUCTIONS);
        nodeLogging.disable();
      } else {
        console.log(gray('Unpaused anvil logs...'));
        nodeLogging.enable();
      }
    } else if (evt.name === 'i') {
      if (nodeLogging.enabled()) return;

      await pause(async () => {
        const [signer] = signers;

        const contracts = buildOutputs.map((info) => getContractsRecursive(info.outputs, signer));

        await interact({
          packages,
          packagesArtifacts: buildOutputs.map((info) => info.outputs),
          contracts,
          signer,
          provider,
        });
      });

      console.log(INITIAL_INSTRUCTIONS);
      console.log(INSTRUCTIONS);
    } else if (evt.name === 'h') {
      if (nodeLogging.enabled()) return;

      if (options.helpInformation) console.log('\n' + options.helpInformation);
      console.log();
      console.log(INSTRUCTIONS);
    }
  });
}

async function createLoggingInterface(node: CannonRpcNode) {
  let enabled = false;
  let outputBuffer = '';
  node.stdout!.on('data', (rawChunk) => {
    const chunk = rawChunk.toString('utf8');
    const newData = chunk
      .split('\n')
      .map((m: string) => {
        return gray('anvil: ') + m;
      })
      .join('\n');

    if (enabled) {
      console.log(newData);
    } else {
      outputBuffer += '\n' + newData;
    }
  });

  const logging = {
    enabled: () => enabled,

    enable: () => {
      if (outputBuffer) {
        console.log(outputBuffer);
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
