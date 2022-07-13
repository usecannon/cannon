#!/usr/bin/env node
import _ from 'lodash';

import { Command } from 'commander';
import prompts from 'prompts';

import { CannonRegistry, ChainBuilder, ChainArtifacts, downloadPackagesRecursive } from '@usecannon/builder';

import pkg from '../package.json';

import Debug from 'debug';
import { runRpc } from './rpc';
import { ethers } from 'ethers';
import { interact } from './interact';

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { URL } from 'node:url';
import { exec } from 'child_process';
import fetch from 'node-fetch';
import { greenBright, green, magentaBright } from 'chalk';

const debug = Debug('cannon:cli');

const program = new Command();

class ReadOnlyCannonRegistry extends CannonRegistry {
  readonly ipfsOptions: ConstructorParameters<typeof CannonRegistry>[0]['ipfsOptions'];

  constructor(opts: ConstructorParameters<typeof CannonRegistry>[0]) {
    super(opts);

    this.ipfsOptions = opts.ipfsOptions;
  }

  async readIpfs(urlOrHash: string): Promise<Buffer> {
    const hash = urlOrHash.replace(/^ipfs:\/\//, '');

    const result = await fetch(
      `${this.ipfsOptions.protocol}://${this.ipfsOptions.host}:${this.ipfsOptions.port}/ipfs/${hash}`
    );

    return await result.buffer();
  }
}

async function writeModuleDeployments(deploymentPath: string, prefix: string, outputs: ChainArtifacts) {
  if (prefix) {
    prefix = prefix + '.';
  }

  for (const m in outputs.imports) {
    await writeModuleDeployments(deploymentPath, `${prefix}${m}`, outputs.imports[m]);
  }

  for (const contract in outputs.contracts) {
    const file = path.join(deploymentPath, `${prefix}${contract}.json`);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const contractOutputs = outputs.contracts![contract];

    const transformedOutput = {
      ...contractOutputs,
      abi: contractOutputs.abi,
    };

    // JSON format is already correct, so we can just output what we have
    await fs.writeFile(file, JSON.stringify(transformedOutput, null, 2));
  }
}

program
  .name('cannon')
  .version(pkg.version)
  .description('Utility for instantly loading cannon packages in standalone contexts.')
  .usage('cannon <name>:<semver> [key=value]')
  .argument('<package>', 'Label and version of the cannon package to load')
  .argument('[settings...]', 'Arguments used to modify the given package')
  .option('-h --host <name>', 'Host which the JSON-RPC server will be exposed')
  .option('-p --port <number>', 'Port which the JSON-RPC server will be exposed')
  .option('-f --fork <url>', 'Fork the network at the specified RPC url')
  .option('--logs', 'Show RPC logs instead of interact prompt. If unspecified, defaults to terminal interactability.')
  .option('--preset <name>', 'Load an alternate setting preset (default: main)')
  .option('--write-deployments <path>', 'Path to write the deployments data (address and ABIs)')
  .option('-e --exit', 'Exit after building')
  .option('--registry-rpc <url>', 'URL to use for eth JSON-RPC endpoint', 'https://cloudflare-eth.com/v1/mainnet')
  .option(
    '--registry-address <address>',
    'Address where the cannon registry is deployed',
    '0xA98BE35415Dd28458DA4c1C034056766cbcaf642'
  )
  .option('--ipfs-url <https://...>', 'Host to pull IPFS resources from', 'https://usecannon.infura-ipfs.io');
async function run() {
  program.parse();
  const options = program.opts();
  const args = program.processedArgs;

  [options.name, options.version] = args[0].split(':');

  if (!options.version) {
    options.version = 'latest';
  }

  options.settings = _.fromPairs(args[1].map((kv: string) => kv.split('=')));

  debug('parsed arguments', options, args);

  // Ensure our version of Anvil is installed
  try {
    await exec('anvil --version');
  } catch (err) {
    const response = await prompts({
      type: 'confirm',
      name: 'confirmation',
      message: 'Cannon requires the foundry toolchain to be installed. Continue?',
      initial: true,
    });

    if (response.confirmation) {
      await exec('curl -L https://foundry.paradigm.xyz | bash');
      await exec('foundryup');
    } else {
      process.exit();
    }
  }
  console.log(magentaBright('Starting local node...'));

  // first start the rpc server
  const provider = await runRpc({
    port: options.port || 8545,
    forkUrl: options.fork,
  });

  // required to supply chainId to the builder
  const networkInfo = await provider.getNetwork();

  // then, start the chain builder
  const signers: ethers.Wallet[] = [];
  // if no signer is specified, load from the default mnemonic chain
  for (let i = 0; i < 10; i++) {
    signers.push(
      ethers.Wallet.fromMnemonic(
        'test test test test test test test test test test test junk',
        `m/44'/60'/0'/0/${i}`
      ).connect(provider)
    );
  }

  // download from package registry
  const parsedIpfs = new URL(options.ipfsUrl);
  const registry = new ReadOnlyCannonRegistry({
    address: options.registryAddress,
    signerOrProvider: new ethers.providers.JsonRpcProvider(options.registryRpc),
    ipfsOptions: {
      protocol: parsedIpfs.protocol.slice(0, parsedIpfs.protocol.length - 1),
      host: parsedIpfs.host,
      port: parsedIpfs.port ? parseInt(parsedIpfs.port) : parsedIpfs.protocol === 'https:' ? 443 : 80,
      /*headers: {
        authorization: `Basic ${Buffer.from(parsedIpfs[2] + ':').toString('base64')}`,
      },*/
    },
  });

  console.log(magentaBright(`Downloading ${options.name + ':' + options.version}...`));

  await downloadPackagesRecursive(
    options.name + ':' + options.version,
    networkInfo.chainId,
    options.preset,
    registry,
    provider
  );

  const builder = new ChainBuilder({
    name: options.name,
    version: options.version,

    readMode: options.fork ? 'metadata' : 'all',
    writeMode: 'none',
    preset: options.preset,

    chainId: networkInfo.chainId,
    provider,
    async getSigner(addr: string) {
      // on test network any user can be conjured
      await provider.send('hardhat_impersonateAccount', [addr]);
      await provider.send('hardhat_setBalance', [addr, ethers.utils.parseEther('10000').toHexString()]);
      return provider.getSigner(addr);
    },
  });

  debug('start build', options.settings);

  console.log(magentaBright(`Deploying ${options.name + ':' + options.version} to local node...`));

  const outputs = await builder.build(options.settings);

  if (options.writeDeployments) {
    console.log(magentaBright(`Writing deployment data to ${options.writeDeployments}...`));
    await fs.mkdirp(options.writeDeployments);
    await writeModuleDeployments(options.writeDeployments, '', outputs);
  }

  debug('start interact');
  console.log(
    greenBright(
      `${options.name + ':' + options.version} has been deployed to a local node running at ${provider.connection.url}`
    )
  );

  if (options.exit) {
    console.log(green('Exiting the CLI.'));
    process.exit();
  }

  let interacting = false;
  const keypress = () => {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        escapeCodeTimeout: 50,
      });
      readline.emitKeypressEvents(process.stdin, rl);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      const listener = async (str: any, key: any) => {
        if (key.ctrl && key.name === 'c') {
          process.exit();
        } else if (str === 'i' && !interacting) {
          interacting = true;
          await interact({
            provider,
            signer: signers[0],
            contracts: _.mapValues(outputs.contracts, (ci) => new ethers.Contract(ci.address, ci.abi, signers[0])),
          });
          console.log(green('Press i to interact with contracts via the command line.'));
          interacting = false;
        }
        process.stdin.removeListener('keypress', listener);
        process.stdin.setRawMode(false);
        rl.close();
        resolve(null);

        await keypress();
      };
      process.stdin.on('keypress', listener);
    });
  };

  console.log(green('Press i to interact with contracts via the command line.'));
  await keypress();
}

run();
