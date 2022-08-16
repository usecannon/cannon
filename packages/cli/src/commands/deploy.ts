import path from 'node:path';
import { ChainBuilder } from '@usecannon/builder';
import { green } from 'chalk';
import { InvalidArgumentError } from 'commander';
import { ethers } from 'ethers';
import { findPackage } from '../helpers';
import { PackageDefinition } from '../types';
import { printChainBuilderOutput } from '../util/printer';
import { writeModuleDeployments } from '../util/write-deployments';

interface Params {
  packageDefinition: PackageDefinition;
  cannonDirectory: string;
  projectDirectory: string;
  networkRpc: string;
  privateKey: string;
  preset: string;
  dryRun: boolean;
  deploymentPath: string;
  prefix?: string;
}

export async function deploy({
  packageDefinition,
  cannonDirectory,
  projectDirectory,
  networkRpc,
  privateKey,
  preset,
  dryRun,
  deploymentPath,
  prefix = '',
}: Params) {
  const { def } = findPackage(cannonDirectory, packageDefinition.name, packageDefinition.version);

  if (dryRun) {
    throw new InvalidArgumentError('--dry-run param not implemented yet');
    /*
    if (dryRun) {
      const network = hre.network;

      if (!network) throw new Error('Selected dryRun network not found in hardhat configuration');

      if (!network.config.chainId) throw new Error('Selected network must have chainId set in hardhat configuration');

      const provider = await hre.run(SUBTASK_RPC, {
        forkUrl: (hre.config.networks[network.name] as HttpNetworkConfig).url,
        port: port || 8545,
        chainId: network.config.chainId,
      });

      let wallets: ethers.Wallet[] = [];
      if (_.isArray(hre.network.config.accounts)) {
        wallets = hre.network.config.accounts.map((account) => new ethers.Wallet(account as string, provider));
      } else {
        const hdAccounts = hre.network.config.accounts as HttpNetworkHDAccountsConfig;
        for (let i = 0; i < hdAccounts.count; i++) {
          wallets.push(ethers.Wallet.fromMnemonic(hdAccounts.path + `/${i + hdAccounts.initialIndex}`, hdAccounts.mnemonic));
        }
      }

      builder = new ChainBuilder({
        name,
        version,
        def,
        preset,

        readMode: wipe ? 'none' : 'metadata',
        writeMode: 'none',

        chainId: network.config.chainId,
        provider,
        baseDir: hre.config.paths.root,
        savedPackagesDir: hre.config.paths.cannon,
        async getSigner(addr: string) {
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
        },

        async getDefaultSigner() {
          if (fundSigners) {
            await provider.send('hardhat_setBalance', [wallets[0].address, ethers.utils.parseEther('10000').toHexString()]);
          }
          return wallets[0];
        },

        async getArtifact(name: string) {
          return hre.artifacts.readArtifact(name);
        },
      });
    
      */
  }

  const provider = new ethers.providers.JsonRpcProvider(networkRpc);
  const { chainId } = await provider.getNetwork();
  const signer = new ethers.Wallet(privateKey, provider);

  const getSigner = (addr: string) => {
    if (addr !== signer.address) {
      throw new Error(`Looking for a signer different that the one configured: ${addr}`);
    }

    return Promise.resolve(signer);
  };

  // TODO download all the dependencies but not the main one
  // TODO Add a confirmation asking fot the deployment being done

  // TODO Add validation of settings (should not allow to put unexistant settings, values, etc)

  const builder = new ChainBuilder({
    name: packageDefinition.name,
    version: packageDefinition.version,
    def,
    preset,

    readMode: 'metadata',
    writeMode: 'metadata',

    provider,
    chainId,
    baseDir: projectDirectory,
    savedPackagesDir: cannonDirectory,
    getSigner,
    getDefaultSigner: () => Promise.resolve(signer),
  });

  const outputs = await builder.build(packageDefinition.settings);

  console.log(green(`Writing deployment artifacts to ./${path.relative(process.cwd(), deploymentPath)}\n`));

  await writeModuleDeployments(deploymentPath, prefix, outputs);

  printChainBuilderOutput(outputs);

  return outputs;
}
