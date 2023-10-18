import { blueBright } from 'chalk';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { DeploymentInfo, IPFSLoader, CannonStorage, PackageReference } from '@usecannon/builder';
import { DEFAULT_REGISTRY_IPFS_ENDPOINT } from '../constants';
import fs from 'node:fs/promises';

export async function fetch(packageRef: string, chainId: number, hash: string, metaHash?: string) {
  if (!/^Qm[1-9A-Za-z]{44}$/.test(hash)) {
    throw new Error(`"${hash}" does not match the IPFS CID v0 format`);
  }

  const cliSettings = resolveCliSettings();

  const { name, version, preset, basePackageRef } = new PackageReference(packageRef);

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);

  const storage = new CannonStorage(localRegistry, {
    ipfs: new IPFSLoader(cliSettings.ipfsUrl! || DEFAULT_REGISTRY_IPFS_ENDPOINT),
  });

  console.log(blueBright('Fetching IPFS data from: '));
  console.log(`\n - ${hash}`);

  try {
    const ipfsUrl = 'ipfs://' + hash;

    // Fetching deployment info
    const deployInfo: DeploymentInfo = await storage.readBlob(ipfsUrl);

    let pkgName = `${name}:${deployInfo.def.version || version}`;

    if (!deployInfo || Object.keys(deployInfo).length === 0) {
      throw new Error(`could not find package data on IPFS using the hash: ${hash}`);
    }

    if (name !== deployInfo.def.name) {
      throw new Error(`deployment data at ${hash} does not match the specified package "${pkgName}"`);
    }

    // Writing deployment blobs directory
    await storage.putBlob(deployInfo);

    const variant = `${deployInfo.chainId || chainId}-${preset || 'main'}`;

    await fs.writeFile(
      localRegistry.getTagReferenceStorage(pkgName, variant),
      ipfsUrl
    );

    if (metaHash) {
      if (!/^Qm[1-9A-Za-z]{44}$/.test(metaHash)) {
        throw new Error(`"${metaHash}" does not match the IPFS CID v0 format`);
      }

      const ipfsUrl = 'ipfs://' + metaHash;
      const metadata = await storage.readBlob(ipfsUrl);

      await storage.putBlob(metadata);

      await fs.writeFile(
        localRegistry.getMetaTagReferenceStorage(pkgName, variant),
        ipfsUrl
      );
    }

    console.log(`\n\nSuccessfully fetched and saved deployment data for the following package: ${pkgName}`);
    console.log(
      `run 'cannon publish ${pkgName} --chain-id <CHAIN_ID> --private-key <PRIVATE_KEY>' to publish the latest package data to the registry`
    );
  } catch (e: any) {
    throw new Error(`${e?.message}`);
  }
}
