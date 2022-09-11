import { CannonRegistry } from '@usecannon/builder';
import { ethers } from 'ethers';
import prompts from 'prompts';
import untildify from 'untildify';
import { parsePackageRef } from '../util/params';

export async function publish(
  cannonDirectory: string,
  privateKey: string,
  packageRef: string,
  tags: string,
  registryAddress: string,
  registryEndpoint: string,
  ipfsEndpoint: string,
  ipfsAuthorizationHeader: string
) {
  cannonDirectory = untildify(cannonDirectory);
  const { name, version } = parsePackageRef(packageRef);

  const provider = new ethers.providers.JsonRpcProvider(registryEndpoint);
  const wallet = new ethers.Wallet(privateKey, provider);

  const response = await prompts({
    type: 'confirm',
    name: 'confirmation',
    message: `This will deploy your package to IPFS and use ${wallet.address} to add the package to the registry. (This will cost a small amount of gas.) Continue?`,
    initial: true,
  });

  if (!response.confirmation) {
    process.exit();
  }

  const ipfsOptions = {
    url: ipfsEndpoint,
    headers: {
      authorization: ipfsAuthorizationHeader,
    },
  };

  const registry = new CannonRegistry({
    ipfsOptions,
    signerOrProvider: wallet,
    address: registryAddress,
  });

  const splitTags = tags.split(',');

  console.log(`Uploading and registering package ${name}:${version}...`);

  const txn = await registry.uploadPackage(`${name}:${version}`, tags ? splitTags : undefined, cannonDirectory);

  console.log('txn:', txn.transactionHash, txn.status);

  console.log('Complete!');
}
