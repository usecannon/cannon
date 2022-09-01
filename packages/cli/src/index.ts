import _ from 'lodash';

import { Command } from 'commander';

import { setupAnvil, checkCannonVersion } from './helpers';
export { setupAnvil };
import { resolve } from 'path';

import {
  CannonRegistry,
  ChainBuilder,
  ChainArtifacts,
  downloadPackagesRecursive,
  ChainBuilderContext,
  CannonWrapperJsonRpcProvider
} from '@usecannon/builder';

import pkg from '../package.json';

import Debug from 'debug';
import { runRpc, getProvider } from './rpc';
import { ethers } from 'ethers';
import { interact } from './interact';

import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';
import { URL } from 'node:url';
import fetch from 'node-fetch';
import { greenBright, green, magentaBright, bold, gray } from 'chalk';

const debug = Debug('cannon:cli');

const program = new Command();

const INITIAL_INSTRUCTIONS = green(`Press ${bold('h')} to see help information for this command.`);
const INSTRUCTIONS = green(
  `Press ${bold('a')} to toggle displaying the logs from your local node.\nPress ${bold(
    'i'
  )} to interact with contracts via the command line.`
);

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

function getContractsRecursive(
  outputs: ChainBuilderContext,
  signer: ethers.Signer,
  prefix?: string
): {
  [x: string]: ethers.Contract;
} {
  let contracts = _.mapValues(outputs.contracts, (ci) => new ethers.Contract(ci.address, ci.abi, signer));
  if (prefix) {
    contracts = _.mapKeys(contracts, (contract, contractName) => `${prefix}.${contractName}`);
  }
  for (const [importName, importOutputs] of Object.entries(outputs.imports)) {
    const newContracts = getContractsRecursive(importOutputs as ChainBuilderContext, signer as ethers.Signer, importName);
    contracts = { ...contracts, ...newContracts };
  }
  return contracts;
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
  .option('--logs', 'Show RPC logs instead of interact prompt. If unspecified, defaults to an interactive terminal.')
  .option('--preset <name>', 'Load an alternate setting preset (default: main)')
  .option('--write-deployments <path>', 'Path to write the deployments data (address and ABIs), like "./deployments"')
  .option('-e --exit', 'Exit after building')
  .option('--registry-rpc <url>', 'URL to use for eth JSON-RPC endpoint', 'https://cloudflare-eth.com/v1/mainnet')
  .option(
    '--registry-address <address>',
    'Address where the cannon registry is deployed',
    '0xA98BE35415Dd28458DA4c1C034056766cbcaf642'
  )
  .option('--ipfs-url <https://...>', 'Host to pull IPFS resources from', 'https://usecannon.infura-ipfs.io')
  .showHelpAfterError('Use --help for more information.');

export async function run() {
  await checkCannonVersion(pkg.version);

  let showAnvilLogs = false;
  let interacting = false;

  if (process.argv.length == 2) {
    program.outputHelp();
    return;
  }

  program.parse();
  const options = program.opts();
  const args = program.processedArgs;

  console.log(magentaBright(`Loading cannon (${pkg.version})...`));

  [options.name, options.version] = args[0].split(':');

  if (!options.version) {
    options.version = 'latest';
  }

  options.settings = _.fromPairs(args[1].map((kv: string) => kv.split('=')));

  debug('parsed arguments', options, args);

  await setupAnvil();

  console.log(magentaBright('Starting local node...'));

  // Start the rpc server
  const anvilInstance = await runRpc({
    port: options.port || 8545,
    forkUrl: options.fork,
  });

  let outputBuffer = '';
  anvilInstance.stdout!.on('data', (rawChunk) => {
    const chunk = rawChunk.toString('utf8');
    const newData = chunk
      .split('\n')
      .map((m: string) => {
        return gray('anvil: ') + m;
      })
      .join('\n');

    if (showAnvilLogs) {
      console.log(newData);
    } else {
      outputBuffer += '\n' + newData;
    }
  });

  let provider = await getProvider(anvilInstance);

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

  // set provider to cannon wrapper to allow error parsing
  provider = new CannonWrapperJsonRpcProvider(outputs, (provider as ethers.providers.JsonRpcProvider).connection);

  if (options.writeDeployments) {
    console.log(magentaBright(`Writing deployment data to ${options.writeDeployments}...`));
    const path = resolve(options.writeDeployments);
    await fs.mkdirp(path);
    await writeModuleDeployments(options.writeDeployments, '', outputs);
  }

  debug('start interact');
  console.log(
    greenBright(
      `${bold(options.name + ':' + options.version)} has been deployed to a local node running at ${bold(
        provider.connection.url
      )}`
    )
  );

  if (options.exit) {
    console.log(green('Exiting the CLI.'));
    process.exit();
  }

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
          // Exit if the user does ctrl + c
          process.exit();
        } else if (str === 'a' && !interacting) {
          // Toggle showAnvilLogs when the user presses "a"
          showAnvilLogs = !showAnvilLogs;
          if (showAnvilLogs) {
            console.log(gray('Unpaused anvil logs...'));
            if (outputBuffer.length) {
              console.log(outputBuffer);
              outputBuffer = '';
            }
          } else {
            console.log(gray('Paused anvil logs...'));
            console.log(INSTRUCTIONS);
          }
        } else if (str === 'i' && !interacting) {
          // Enter the interact tool when the user presses "i"
          interacting = true;
          await interact({
            provider,
            signer: signers[0],
            contracts: getContractsRecursive(outputs, signers[0]),
          });
          console.log(INSTRUCTIONS);
          interacting = false;
        } else if (str === 'h' && !interacting) {
          console.log('\n' + program.helpInformation());
          console.log(INSTRUCTIONS);
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

  console.log(INITIAL_INSTRUCTIONS);
  console.log(INSTRUCTIONS);
  await keypress();
}
