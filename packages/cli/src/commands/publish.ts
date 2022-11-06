import { CannonRegistry, getAllDeploymentInfos, getPackageDir, getSavedPackagesDir } from '@usecannon/builder';
import { ethers } from 'ethers';
import _ from 'lodash';
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
  registrationOptions?: RegistrationOptions,
  quiet = false
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

  if (!quiet) {
    console.log('Uploaded to IPFS:', ipfsHash);
  }

  const manifest = await getAllDeploymentInfos(getPackageDir(getSavedPackagesDir(), name, version));
  let registerHash: string | null = null;

  let splitTags = tags.split(',');

  if (registrationOptions) {
    if (name === manifest.def.name && version !== manifest.def.version) {
      splitTags.push(version);
    }

    splitTags = _.uniq(splitTags);

    if (!quiet) {
      console.log(`Register package ${manifest.def.name}:${manifest.def.version} (tags:)...`);
    }

    const txn = await registry.publish(manifest.def.name, manifest.def.version, splitTags, ipfsHash);

    if (!quiet) {
      console.log('Publish Txn:', txn.transactionHash, txn.status);
    }

    registerHash = txn.transactionHash;
  } else {
    console.log('Skipping registration (registration parameters not specified).');
  }

  console.log(
    JSON.stringify({
      name: manifest.def.name,
      version: manifest.def.version,
      tags: splitTags,
      ipfsHash,
      registerHash,
    })
  );
}
