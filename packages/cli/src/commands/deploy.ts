import path from 'node:path';
import { CannonWrapperGenericProvider, ChainBuilder, downloadPackagesRecursive, Events } from '@usecannon/builder';
import { green } from 'chalk';
import { ethers } from 'ethers';
import { findPackage } from '../helpers';
import { PackageDefinition } from '../types';
import { printChainBuilderOutput } from '../util/printer';
import { writeModuleDeployments } from '../util/write-deployments';
import createRegistry from '../registry';
import { getProvider, runRpc } from '../rpc';

interface DeployOptions {
  packageDefinition: PackageDefinition;
  cannonDirectory: string;
  projectDirectory?: string;

  provider: ethers.providers.Provider;
  impersonate?: string;
  mnemonic?: string;
  privateKey?: string;
  fundAddresses?: string[];

  preset: string;
  dryRun: boolean;
  deploymentPath?: string;
  prefix?: string;
  registryIpfsUrl: string;
  registryRpcUrl: string;
  registryAddress: string;
}

export async function deploy(options: DeployOptions) {
  const { def } = findPackage(
    options.cannonDirectory,
    options.packageDefinition.name, 
    options.packageDefinition.version
  );

  const { chainId } = await options.provider.getNetwork();

  let cannonProvider = new CannonWrapperGenericProvider({}, options.provider);

  if ((options.provider as CannonWrapperGenericProvider)._isCannonWrapperProvider) {
    // no need to re-wrap 
    cannonProvider = options.provider as CannonWrapperGenericProvider;
  } else if (options.dryRun) {
    if (!(options.provider as ethers.providers.JsonRpcProvider).connection) {
      const node = await runRpc({
        port: 8545,
      });

      const anvilProvider = await getProvider(node);

      cannonProvider = new CannonWrapperGenericProvider({}, anvilProvider);
    }
    else {
      throw new Error('cannot fork supplied non-jsonrpc network (are you sure you need to dry-run?)');
    }
  }

  const signers = createSigners(cannonProvider, options);

  let getSigner = async (addr: string) => {
    for (const signer of signers) {
      if (addr.toLowerCase() === (await signer.getAddress()).toLowerCase())  {
        return signer;
      }
    }

    throw new Error(`signer not found from configuration`);
  };

  let getDefaultSigner = () => Promise.resolve(signers[0]);

  if (options.impersonate) {
    getSigner = async (addr: string) => {
      // on test network any user can be conjured
      await cannonProvider.send('hardhat_impersonateAccount', [addr]);
      await cannonProvider.send('hardhat_setBalance', [addr, ethers.utils.parseEther('10000').toHexString()]);
      return cannonProvider.getSigner(addr);
    }

    getDefaultSigner = () => getSigner(options.impersonate!);
  }

  const builder = new ChainBuilder({
    name: options.packageDefinition.name,
    version: options.packageDefinition.version,
    def,
    preset: options.preset,

    readMode: 'metadata',
    writeMode: options.dryRun ? 'none' : 'metadata',

    provider: cannonProvider,
    chainId,
    baseDir: options.projectDirectory,
    savedPackagesDir: options.cannonDirectory,
    getSigner,
    getDefaultSigner,
  });

  const registry = createRegistry({
    registryAddress: options.registryAddress,
    registryRpc: options.registryRpcUrl,
    ipfsUrl: options.registryIpfsUrl,
  });

  const dependencies = 
    await builder.def.getRequiredImports(
      await builder.populateSettings(options.packageDefinition.settings)
    );

  for (const dependency of dependencies) {
    console.log(`Loading dependency tree ${dependency.source} (${dependency.chainId}-${dependency.preset})`);
    await downloadPackagesRecursive(
      dependency.source,
      dependency.chainId,
      dependency.preset,
      registry,
      builder.provider,
      builder.packagesDir
    );
  }

  builder.on(Events.PreStepExecute, (t, n) => console.log(`\nexec: ${t}.${n}`));
  builder.on(Events.DeployContract, (n, c) => console.log(`deployed contract ${n} (${c.address})`));
  builder.on(Events.DeployTxn, (n, t) => console.log(`ran txn ${n} (${t.hash})`));

  const outputs = await builder.build(options.packageDefinition.settings);

  if (options.deploymentPath) {
    let relativePath = path.relative(process.cwd(), options.deploymentPath);
    if (!relativePath.startsWith('/')) {
      relativePath = './' + relativePath;
    }
    console.log(green(`Writing deployment artifacts to ${relativePath}\n`));
    await writeModuleDeployments(options.deploymentPath, options.prefix || '', outputs);
  }

  printChainBuilderOutput(outputs);

  return { outputs, signers, provider: cannonProvider };
}

function createSigners(provider: CannonWrapperGenericProvider, options: DeployOptions): ethers.Signer[] {
  const signers: ethers.Signer[] = [];

  if (options.privateKey) {
    for (const pkey in options.privateKey.split(',')) {
      signers.push(new ethers.Wallet(options.privateKey, provider));
    }
  }
  else if (options.mnemonic) {
    for (let i = 0; i < 10; i++) {
      signers.push(
        ethers.Wallet.fromMnemonic(
          options.mnemonic,
          `m/44'/60'/0'/0/${i}`
        ).connect(provider)
      );
    }
  }
  else if (options.impersonate && options.dryRun) {
    signers.push(provider.getSigner(options.impersonate));
  }

  return signers;
}