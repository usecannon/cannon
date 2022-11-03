import { greenBright, green, magentaBright, bold, gray, yellow } from 'chalk';
import { ethers } from 'ethers';
import {
  ChainBuilder,
  ChainBuilderContext,
  downloadPackagesRecursive,
  getAllDeploymentInfos,
  getPackageDir,
  getSavedPackagesDir,
} from '@usecannon/builder';
import { PackageDefinition } from '../types';
import { setupAnvil } from '../helpers';
import { CannonRpcNode, getProvider } from '../rpc';
import createRegistry from '../registry';
import { interact } from '../interact';
import { resolve } from 'path';
import onKeypress from '../util/on-keypress';
import { build } from './build';
import _ from 'lodash';
import { getContractsRecursive } from '../util/contracts-recursive';

export interface RunOptions {
  node: CannonRpcNode;
  file?: string;
  logs?: boolean;
  writeDeployments?: string;
  preset: string;
  cannonDirectory: string;
  projectDirectory?: string;
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
  await setupAnvil();

  console.log(magentaBright('Starting local node...'));

  // Start the rpc server
  const node = options.node;
  const provider = await getProvider(node);
  const nodeLogging = await createLoggingInterface(node);

  if (options.fundAddresses && options.fundAddresses.length) {
    for (const fundAddress of options.fundAddresses) {
      await provider.send('hardhat_setBalance', [fundAddress, `0x${(1e22).toString(16)}`]);
    }
  }

  const networkInfo = await provider.getNetwork();

  const registry = createRegistry({
    registryAddress: options.registryAddress,
    registryRpc: options.registryRpcUrl,
    ipfsUrl: options.registryIpfsUrl,
    ipfsAuthorizationHeader: options.registryIpfsAuthorizationHeader,
  });

  for (const pkg of packages) {
    const name = `${pkg.name}:${pkg.version}`;
    console.log(magentaBright(`Downloading ${name}...`));
    await downloadPackagesRecursive(name, networkInfo.chainId, options.preset, registry, provider, options.cannonDirectory);
  }

  const buildOutputs: { pkg: PackageDefinition; outputs: ChainBuilderContext }[] = [];

  let signers: ethers.Signer[] = [];

  const getSigner = async (addr: string) => {
    // on test network any user can be conjured
    await provider.send('hardhat_impersonateAccount', [addr]);
    await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);

    return provider.getSigner(addr);
  };

  // set up signers
  for (const addr of (options.impersonate || '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266').split(',')) {
    await provider.send('hardhat_impersonateAccount', [addr]);
    await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
    signers = [provider.getSigner(addr)];
  }

  for (const pkg of packages) {
    const { name, version } = pkg;

    if (node.forkUrl) {
      console.log(magentaBright(`Fork-deploying ${name}:${version}...`));

      const manifest = await getAllDeploymentInfos(getPackageDir(getSavedPackagesDir(), name, version));

      const builder = new ChainBuilder({
        name: pkg.name,
        version: pkg.version,
        def: manifest.deploys[networkInfo.chainId.toString()]['main'].def || manifest.def,
        preset: options.preset,

        readMode: 'metadata',
        writeMode: 'none',

        provider,
        chainId: networkInfo.chainId,
        baseDir: options.projectDirectory,
        savedPackagesDir: options.cannonDirectory,
        getSigner,
        getDefaultSigner: () => getSigner('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'),
      });

      // we want to preserve the same options on build (unless they are overridden with the run configuration)
      const outputs = await builder.build(
        _.assign(manifest.deploys[networkInfo.chainId.toString()]['main'].options, pkg.settings)
      );

      buildOutputs.push({ pkg, outputs });

      // ensure the provider will be aware of all the artifacts (for now just merge them together)
      // TODO: if two packages have contracts or etc. same name artifacts will get mangled together
      // so perhaps we could just merge them together onto a virtual "super" cannon package?
      _.assign(provider.artifacts, outputs);
    } else {
      console.log(magentaBright(`Building ${name}:${version}...`));

      const { outputs } = await build({
        ...options,
        packageDefinition: pkg,
        node,
        preset: options.preset,
        persist: false,
        deploymentPath: options.writeDeployments ? resolve(options.writeDeployments) : undefined,
      });

      buildOutputs.push({ pkg, outputs });
    }

    console.log(
      greenBright(
        `${bold(`${name}:${version}`)} has been deployed to a local node running at ${bold('localhost:' + node.port)}`
      )
    );

    if (node.forkUrl) {
      console.log(gray(`Running from fork ${bold(node.forkUrl)}`));
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
