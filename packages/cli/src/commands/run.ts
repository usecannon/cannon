import readline from 'node:readline';
import { Command } from 'commander';
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

export interface RunOptions {
  host?: string;
  port?: number;
  fork?: string;
  file?: string;
  logs?: boolean;
  writeDeployments?: string;
  preset: string;
  registryRpc: string;
  registryAddress: string;
  ipfsUrl: string;
}
/*
  .addFlag('impersonate', 'Create impersonated signers instead of using real wallets. Only useful with --dry-run')
  .addFlag(
    'fundSigners',
    'Ensure wallets have plenty of gas token to do deployment operations. Only useful with --dry-run and --impersonate'
  )

  from getSigner code:

          if (impersonate) {
            await provider.send('hardhat_impersonateAccount', [addr]);

            if (fundSigners) {
              await provider.send('hardhat_setBalance', [addr, ethers.utils.parseEther('10000').toHexString()]);
            }

            return provider.getSigner(addr);
          } else {
            const foundWallet = wallets.find((wallet) => wallet.address == addr);
            if (!foundWallet) {
              throw new Error(
                `You haven't provided the private key for signer ${addr}. Please check your Hardhat configuration and try again. List of known addresses: ${wallets
                  .map((w) => w.address)
                  .join(', ')}`
              );
            }
            return foundWallet;
          }
*/

const INITIAL_INSTRUCTIONS = green(`Press ${bold('h')} to see help information for this command.`);
const INSTRUCTIONS = green(
  `Press ${bold('a')} to toggle displaying the logs from your local node.\nPress ${bold(
    'i'
  )} to interact with contracts via the command line.`
);

export async function run(packages: PackageDefinition[], options: RunOptions, program: Command) {
  if (packages.length && options.file) {
    throw new Error('You cannot run a cannon node both defining a file and giving it packages');
  }

  if (!packages.length || options.file) {
    // TODO: implement cannon.json file parsing. And allow to spin up several anvil nodes on different ports
    throw new Error('cannon.json file parsing not implemented yet');
  }

  await setupAnvil();

  console.log(magentaBright('Starting local node...'));

  // Start the rpc server
  const node = await createNode({ port: Number(options.port) || 8545, forkUrl: options.fork });

  const networkInfo = await node.provider.getNetwork();
  const registry = createRegistry({
    registryAddress: options.registryAddress,
    registryRpc: options.registryRpc,
    ipfsUrl: options.ipfsUrl,
  });

  const getSigner = async (addr: string) => {
    // on test network any user can be conjured
    await node.provider.send('hardhat_impersonateAccount', [addr]);
    await node.provider.send('hardhat_setBalance', [addr, ethers.utils.parseEther('10000').toHexString()]);
    return node.provider.getSigner(addr);
  };

  for (const pkg of packages) {
    const name = `${pkg.name}:${pkg.version}`;
    console.log(magentaBright(`Downloading ${name}...`));
    await downloadPackagesRecursive(name, networkInfo.chainId, options.preset, registry, node.provider);
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

  console.log();

  const signers = createSigners(node.provider);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log(INITIAL_INSTRUCTIONS);
    console.log(INSTRUCTIONS);

    await onKeypress(async (evt, close) => {
      if (evt.ctrl && evt.name === 'c') {
        process.exit();
      } else if (evt.name === 'a') {
        // Toggle showAnvilLogs when the user presses "a"
        if (node.logging()) {
          console.log(gray('Paused anvil logs...'));
          console.log(INSTRUCTIONS);
        } else {
          console.log(gray('Unpaused anvil logs...'));
        }

        node.toggleLogging();
      } else if (evt.name === 'i') {
        if (buildOutputs.length > 1) {
          // TODO add interact on multiple packages compatibility
          throw new Error('Interact command not implemented when running multiple packages');
        }

        await close();
        await interact({
          provider: node.provider,
          signer: signers[0],
          contracts: getContractsRecursive(buildOutputs[0], signers[0]),
        });
      } else if (evt.name === 'h') {
        console.log('\n' + program.helpInformation());
        console.log(INSTRUCTIONS);
      }
    });
  }
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

interface KeyboardEvent {
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}

function onKeypress(handleKeyPress: (evt: KeyboardEvent, close: () => void) => void) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      escapeCodeTimeout: 50,
    });

    readline.emitKeypressEvents(process.stdin, rl);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const listener = (_: string, key: KeyboardEvent) => {
      handleKeyPress(key, close);
    };

    const close = () => {
      process.stdin.removeListener('keypress', listener);
      process.stdin.setRawMode(false);
      rl.close();
      resolve(null);
    };

    process.stdin.on('keypress', listener);
  });
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

    toggleLogging: () => {
      if (logging) {
        node.disableLogging();
      } else {
        node.enableLogging();
      }
    },
  };

  return node;
}
