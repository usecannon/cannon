import { greenBright, green, magentaBright, bold, gray, yellow } from 'chalk';
import { ethers } from 'ethers';
import { mapKeys, mapValues } from 'lodash';
import { ChainBuilderContext, downloadPackagesRecursive } from '@usecannon/builder';
import { PackageDefinition } from '../types';
import { setupAnvil } from '../helpers';
import { getProvider, runRpc } from '../rpc';
import createRegistry from '../registry';
import { interact } from '../interact';
import { resolve } from 'path';
import onKeypress from '../util/on-keypress';
import { deploy } from './deploy';
import { build } from './build';

export interface RunOptions {
  port?: number;
  fork?: string;
  file?: string;
  logs?: boolean;
  writeDeployments?: string;
  preset: string;
  cannonDirectory: string;
  registryIpfsUrl: string;
  registryIpfsAuthorizationHeader?: string;
  registryRpcUrl: string;
  registryAddress: string;
  impersonate: string;
  mnemonic?: string;
  privateKey?: string;
  fundAddresses?: string[];
  helpInformation?: string;
}

const INITIAL_INSTRUCTIONS = green(`Press ${bold('h')} to see help information for this command.`);
const INSTRUCTIONS = green(
  `Press ${bold('a')} to toggle displaying the logs from your local node.\nPress ${bold(
    'i'
  )} to interact with contracts via the command line.`
);

export async function run(packages: PackageDefinition[], options: RunOptions) {
  /*
  if (packages.length && options.file) {
    throw new Error('You cannot run a cannon node both defining a file and giving it packages');
  }

  if (!packages.length || options.file) {
    // TODO: implement cannon.json file parsing. And allow to spin up several anvil nodes on different ports
    throw new Error('cannon.json file parsing not implemented yet');
  }
  */

  await setupAnvil();

  console.log(magentaBright('Starting local node...'));

  // Start the rpc server
  const node = await createNode({
    port: Number(options.port) || 8545,
    forkUrl: options.fork,
  });

  if (options.fundAddresses && options.fundAddresses.length) {
    for (const fundAddress of options.fundAddresses) {
      await node.provider.send('hardhat_setBalance', [fundAddress, `0x${(1e22).toString(16)}`]);
    }
  }

  const networkInfo = await node.provider.getNetwork();

  const registry = createRegistry({
    registryAddress: options.registryAddress,
    registryRpc: options.registryRpcUrl,
    ipfsUrl: options.registryIpfsUrl,
    ipfsAuthorizationHeader: options.registryIpfsAuthorizationHeader,
  });

  for (const pkg of packages) {
    const name = `${pkg.name}:${pkg.version}`;
    console.log(magentaBright(`Downloading ${name}...`));
    await downloadPackagesRecursive(
      name,
      networkInfo.chainId,
      options.preset,
      registry,
      node.provider,
      options.cannonDirectory
    );
  }

  const buildOutputs: { pkg: PackageDefinition; outputs: ChainBuilderContext }[] = [];

  let signers: ethers.Signer[] = [];

  for (const pkg of packages) {
    const { name, version } = pkg;

    if (options.fork) {
      console.log(magentaBright(`Fork-deploying ${name}:${version}...`));

      const { outputs, signers: deploySigners } = await deploy({
        ...options,
        provider: node.provider,
        packageDefinition: pkg,
        dryRun: !!options.fork,
        deploymentPath: options.writeDeployments ? resolve(options.writeDeployments) : undefined,
      });

      buildOutputs.push({ pkg, outputs });
      signers = deploySigners;
    } else {
      console.log(magentaBright(`Building ${name}:${version}...`));

      const { outputs } = await build({
        ...options,
        packageDefinition: pkg,
        node: node.instance,
        preset: options.preset,
        persist: false,
      });

      // todo: this is a bit of a dup
      if (options.impersonate) {
        for (const addr of options.impersonate.split(',')) {
          await node.provider.send('hardhat_impersonateAccount', [addr]);
          await node.provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
          signers = [node.provider.getSigner(addr)];
        }
      }

      buildOutputs.push({ pkg, outputs });
    }

    console.log(
      greenBright(
        `${bold(`${name}:${version}`)} has been deployed to a local node running at ${bold(
          'localhost:' + (options.port || 8545)
        )}`
      )
    );
  }

  if (!signers.length) {
    console.warn(
      yellow(
        'WARNING: no signers resolved. Specify signers with --mnemonic or --private-key (or use --impersonate if on a fork).'
      )
    );
  }

  if (options.logs) {
    return {
      signers,
      outputs: buildOutputs,
      provider: node.provider,
      node: node.instance,
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
      if (node.logging()) {
        console.log(gray('Paused anvil logs...'));
        console.log(INSTRUCTIONS);
        node.disableLogging();
      } else {
        console.log(gray('Unpaused anvil logs...'));
        node.enableLogging();
      }
    } else if (evt.name === 'i') {
      if (node.logging()) return;

      await pause(async () => {
        const [signer] = signers;

        const contracts = buildOutputs.map((info) => getContractsRecursive(info.outputs, signer));

        await interact({
          packages,
          contracts,
          signer,
          provider: node.provider,
        });
      });

      console.log(INITIAL_INSTRUCTIONS);
      console.log(INSTRUCTIONS);
    } else if (evt.name === 'h') {
      if (node.logging()) return;

      if (options.helpInformation) console.log('\n' + options.helpInformation);
      console.log();
      console.log(INSTRUCTIONS);
    }
  });
}

function getContractsRecursive(
  outputs: ChainBuilderContext,
  signer: ethers.Signer,
  prefix?: string
): {
  [x: string]: ethers.Contract;
} {
  let contracts = mapValues(outputs.contracts, (ci) => new ethers.Contract(ci.address, ci.abi, signer));
  if (prefix) {
    contracts = mapKeys(contracts, (_, contractName) => `${prefix}.${contractName}`);
  }
  for (const [importName, importOutputs] of Object.entries(outputs.imports)) {
    const newContracts = getContractsRecursive(importOutputs as ChainBuilderContext, signer as ethers.Signer, importName);
    contracts = { ...contracts, ...newContracts };
  }
  return contracts;
}

async function createNode({ port = 8545, forkUrl = '' }) {
  const instance = await runRpc({
    port,
    forkUrl,
  });

  let logging = false;
  let outputBuffer = '';
  instance.stdout!.on('data', (rawChunk) => {
    const chunk = rawChunk.toString('utf8');
    const newData = chunk
      .split('\n')
      .map((m: string) => {
        return gray('anvil: ') + m;
      })
      .join('\n');

    if (logging) {
      console.log(newData);
    } else {
      outputBuffer += '\n' + newData;
    }
  });

  const provider = await getProvider(instance);

  const node = {
    instance,
    provider,

    logging: () => logging,

    enableLogging: () => {
      if (outputBuffer) {
        console.log(outputBuffer);
        outputBuffer = '';
      }

      logging = true;
    },

    disableLogging: () => {
      logging = false;
    },
  };

  return node;
}
