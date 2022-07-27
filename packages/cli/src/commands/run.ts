import { Command } from 'commander';
import { greenBright, green, magentaBright, bold, gray } from 'chalk';
import { ethers } from 'ethers';
import { ChainBuilder, downloadPackagesRecursive } from '@usecannon/builder';
import { PackageDefinition } from '../types';
import { setupAnvil } from '../helpers';
import { getProvider, runRpc } from '../rpc';
import createRegistry from '../registry';

export interface RunOptions {
  host?: string;
  port?: number;
  fork?: string;
  file?: string;
  logs?: boolean;
  preset: string;
  registryRpc: string;
  registryAddress: string;
  ipfsUrl: string;
}

export async function run(packages: PackageDefinition[], options: RunOptions, program: Command) {
  console.log(packages);
  console.log(options);

  if (packages.length && options.file) {
    throw new Error('You cannot run a cannon node both defining a file and giving it packages');
  }

  if (!packages.length || options.file) {
    // TODO: implement cannon.json file parsing.
    // @dev: now the cannon.json file specifies a chainId per image, but this
    // is not currently being handled if they are different
    throw new Error('cannon.json file parsing not implemented yet');
  }

  await setupAnvil();

  console.log(magentaBright('Starting local node...'));

  // Start the rpc server
  const anvilInstance = await runRpc({
    port: Number(options.port) || 8545,
    forkUrl: options.fork,
  });

  const provider = await getProvider(anvilInstance);
  const networkInfo = await provider.getNetwork();
  const registry = createRegistry({
    registryAddress: options.registryAddress,
    registryRpc: options.registryRpc,
    ipfsUrl: options.ipfsUrl,
  });

  const getSigner = async (addr: string) => {
    // on test network any user can be conjured
    await provider.send('hardhat_impersonateAccount', [addr]);
    await provider.send('hardhat_setBalance', [addr, ethers.utils.parseEther('10000').toHexString()]);
    return provider.getSigner(addr);
  };

  for (const pkg of packages) {
    const name = `${pkg.name}:${pkg.version}`;
    console.log(magentaBright(`Downloading ${name}...`));
    await downloadPackagesRecursive(name, networkInfo.chainId, options.preset, registry, provider);
  }

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
      provider,
      getSigner,
    });

    const outputs = await builder.build(settings);

    console.log(outputs);
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
