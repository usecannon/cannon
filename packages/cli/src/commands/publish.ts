import { CannonRegistry } from '@usecannon/builder';
import { ethers } from 'ethers';
import untildify from 'untildify';
import { parsePackageRef } from '../util/params';

export interface RegistrationOptions {
  signer: ethers.Signer;
  registryAddress: string;
}

export async function publish(
  cannonDirectory: string,
  packageRef: string,
  tags: string,
  ipfsEndpoint: string,
  ipfsAuthorizationHeader: string,
  registrationOptions?: RegistrationOptions
) {
  cannonDirectory = untildify(cannonDirectory);
  const { name, version } = parsePackageRef(packageRef);

  const ipfsOptions = {
    url: ipfsEndpoint,
    headers: {
      authorization: ipfsAuthorizationHeader,
    },
  };

  const registry = new CannonRegistry({
    ipfsOptions,
    signerOrProvider: registrationOptions?.signer ?? null,
    address: registrationOptions?.registryAddress ?? null,
  });

  const manifestIpfsInfo = await registry.uploadPackage(`${name}:${version}`, cannonDirectory);

  const ipfsHash = manifestIpfsInfo.cid.toV0().toString();

  console.log('Uploaded to IPFS:', ipfsHash);

  if (registrationOptions) {
    console.log(`Register package ${name}:${version}...`);

    const splitTags = tags.split(',');
    const txn = await registry.publish(name, version, splitTags, ipfsHash);

    console.log('Publish Txn:', txn.transactionHash, txn.status);
  } else {
    console.log('Skipping registration (registration parameters not specified).');
  }

  console.log('Complete!');
}
