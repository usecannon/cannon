#!/usr/bin/env node
import _ from 'lodash';

import { Command } from 'commander';

import { CannonRegistry, ChainBuilder, downloadPackagesRecursive } from '@usecannon/builder';

import pkg from '../package.json';

import Debug from 'debug';
import { runRpc } from './rpc';
import { ethers } from 'ethers';
import { interact } from './interact';

import fetch from 'node-fetch';
import { blue, blueBright } from 'chalk';

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

  .option(
    '--registry-rpc',
    'URL to use for eth JSON-RPC endpoint',
    'https://rinkeby.infura.io/v3/4d5f81b4beb14715a4fe930ec6a201f7'
  )
  .option(
    '--registry-address',
    'Address where the cannon registry is deployed',
    '0xa7F19685A1970A84Da7212ed3D74Cc5237408813'
  )
  .option('--ipfs-url', 'Host to pull IPFS resources from', 'https://cannon.infura-ipfs.io:443');
  //.option('--ipfs-url', 'Host to pull IPFS resources from', 'https://25JrnDgeR88vTvaEDhPEP2vDtOJ@ipfs.infura.io:5001');

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
  const parsedIpfs = options.ipfsUrl.match(/^(.*):\/\/(.*):(.*)$/);
  const registry = new ReadOnlyCannonRegistry({
    address: options.registryAddress,
    signerOrProvider: new ethers.providers.JsonRpcProvider(options.registryRpc),
    ipfsOptions: {
      protocol: parsedIpfs[1],
      host: parsedIpfs[2],
      port: parsedIpfs[3],
      /*headers: {
        authorization: `Basic ${Buffer.from(parsedIpfs[2] + ':').toString('base64')}`,
      },*/
    },
  });

  console.log(blueBright('downloading dependencies...'));

  await downloadPackagesRecursive(options.name + ':' + options.version, networkInfo.chainId, options.preset, registry);

  const builder = new ChainBuilder({
    name: options.name,
    version: options.version,

    readMode: options.fork ? 'metadata' : 'all',
    writeMode: 'none',
    preset: options.preset,

    chainId: networkInfo.chainId,
    provider,
    async getSigner(addr: string) {
      const signer = signers.find((s) => s.address === addr);

      if (!signer) {
        throw new Error(`signer ${addr} not found`);
      }

      return signer;
    },
  });

  debug('start build', options.settings);

  console.log(blueBright('assembling chain...'));

  const outputs = await builder.build(options.settings);

  debug('start interact');

  await interact({
    provider,
    signer: signers[0],
    contracts: _.mapValues(outputs.contracts, (ci) => new ethers.Contract(ci.address, ci.abi, signers[0])),
  });
}

run();
