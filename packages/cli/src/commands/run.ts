import { greenBright, green, magentaBright, bold, gray } from 'chalk';
import { ethers } from 'ethers';
import { mapKeys, mapValues } from 'lodash';
import { ChainBuilder, ChainBuilderContext, downloadPackagesRecursive } from '@usecannon/builder';
import { PackageDefinition } from '../types';
import { setupAnvil } from '../helpers';
import { getProvider, runRpc } from '../rpc';
import createRegistry from '../registry';
import { interact } from '../interact';
import { printChainBuilderOutput } from '../util/printer';
import { writeModuleDeployments } from '../util/write-deployments';
import fs from 'fs-extra';
import { resolve } from 'path';
import onKeypress from '../util/on-keypress';

export interface RunOptions {
  port?: number;
  fork?: string;
  file?: string;
  logs?: boolean;
  writeDeployments?: string;
  preset: string;
  cannonDirectory: string;
  registryIpfsUrl: string;
  registryRpcUrl: string;
  registryAddress: string;
  impersonate: boolean;
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

  const getSigner = async (addr: string) => {
    // on test network any user can be conjured
    if (options.impersonate) {
      await node.provider.send('hardhat_impersonateAccount', [addr]);
    }

    return node.provider.getSigner(addr);
  };

  if (options.fundAddresses && options.fundAddresses.length) {
    for (const fundAddress of options.fundAddresses) {
      await node.provider.send('hardhat_setBalance', [fundAddress, ethers.utils.parseEther('10000').toHexString()]);
    }
  }

  const networkInfo = await node.provider.getNetwork();

  const registry = createRegistry({
    registryAddress: options.registryAddress,
    registryRpc: options.registryRpcUrl,
    ipfsUrl: options.registryIpfsUrl,
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

  const buildOutputs: ChainBuilderContext[] = [];

  for (const pkg of packages) {
    const { name, version, settings } = pkg;

    console.log(magentaBright(`Building ${name}:${version}...`));

    const builder = new ChainBuilder({
      name,
      version,
      readMode: options.fork ? 'metadata' : 'all',
      writeMode: 'none',
      preset: options.preset,
      savedPackagesDir: options.cannonDirectory,
      chainId: networkInfo.chainId,
      provider: node.provider,
      getSigner,
    });

    const outputs = await builder.build(settings);

    console.log(
      greenBright(
        `${bold(`${name}:${version}`)} has been deployed to a local node running at ${bold(node.provider.connection.url)}`
      )
    );

    buildOutputs.push(outputs);

    if (options.writeDeployments) {
      console.log(magentaBright(`Writing deployment data to ${options.writeDeployments}...`));
      const path = resolve(options.writeDeployments);
      await fs.mkdirp(path);
      await writeModuleDeployments(options.writeDeployments, '', outputs);
    }

    printChainBuilderOutput(outputs);
  }

  const signers = createSigners(node.provider);

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

        const contracts = buildOutputs.map((output) => getContractsRecursive(output, signer));

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

function createSigners(provider: ethers.providers.BaseProvider): ethers.Wallet[] {
  const signers: ethers.Wallet[] = [];

  for (let i = 0; i < 10; i++) {
    signers.push(
      ethers.Wallet.fromMnemonic(
        'test test test test test test test test test test test junk',
        `m/44'/60'/0'/0/${i}`
      ).connect(provider)
    );
  }

  return signers;
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
