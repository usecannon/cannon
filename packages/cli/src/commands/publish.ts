import { CannonRegistry } from '@usecannon/builder';
import { ethers } from 'ethers';
import prompts from 'prompts';
import { findPackage } from '../helpers';

export async function publish(
  packagesDir: string,
  privateKey: string,
  packageRef: string,
  tags: string,
  registryAddress: string
) {
  const { name, version } = findPackage(packageRef);

  const wallet = new ethers.Wallet(privateKey);

  const response = await prompts({
    type: 'confirm',
    name: 'confirmation',
    message: `This will deploy your package to IPFS and use ${wallet.address} to add the package to the registry. (This will cost a small amount of gas.) Continue?`,
    initial: true,
  });

  if (!response.confirmation) {
    process.exit();
  }

  const registry = new CannonRegistry({
    ipfsOptions: {}, //hre.config.cannon.ipfsConnection --- HOW DO WE HANDLE THIS FOR FOUNDRY?
    signerOrProvider: wallet,
    address: registryAddress,
  });

  const splitTags = tags.split(',');

  console.log(`Uploading and registering package ${name}:${version}...`);

  const txn = await registry.uploadPackage(`${name}:${version}`, tags ? splitTags : undefined, packagesDir);

  console.log('txn:', txn.transactionHash, txn.status);

  console.log('Complete!');
}
