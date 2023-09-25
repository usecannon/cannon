import { blueBright } from 'chalk';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { getMainLoader } from '../loader';
import { DeploymentInfo, CannonStorage, IPFSLoader, PackageReference } from '@usecannon/builder';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_REGISTRY_IPFS_ENDPOINT } from '../constants';

export async function fetch(packageRef: string, hash: string, metaHash?: string) {
  if (!/^Qm[1-9A-Za-z]{44}$/.test(hash)) {
    throw new Error(`One of your IPFS hashes does not match the IPFS CID v0 format`)
  }

  const cliSettings = resolveCliSettings();

  const { name, preset, basePackageRef } = new PackageReference(packageRef);

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);
  const fromStorage = new CannonStorage(localRegistry, {
    ipfs: new IPFSLoader(cliSettings.ipfsUrl! || DEFAULT_REGISTRY_IPFS_ENDPOINT),
  });
  const toStorage = new CannonStorage(localRegistry, getMainLoader(cliSettings));
  
  console.log(blueBright('Fetching IPFS data from: '));
  console.log(`\n - ${hash}`);
  
  try {
      const filteredHash = 'ipfs://' + hash;

      // Fetching deployment info
      const deployInfo: DeploymentInfo = await fromStorage.readBlob(filteredHash);

      if (!deployInfo) {
        throw new Error(`could not find package data on IPFS using the following hash: ${hash}`);
      }

      if (name !== deployInfo.def.name) {
        throw new Error(`deployment data at ${hash} does not match the specified package, `);
      }
      
      // Writing deployment blobs directory
      await toStorage.putBlob(deployInfo);

      const variant = `${deployInfo.chainId}-${preset || 'main'}`

      const tagsFolder = path.join(cliSettings.cannonDirectory, 'tags');

      fs.writeFile(path.join(tagsFolder, `${basePackageRef.replace(':', '_')}_${variant}.txt`), filteredHash)

      if (metaHash) {
        if (!/^Qm[1-9A-Za-z]{44}$/.test(metaHash)) {
          throw new Error(`One of your IPFS hashes does not match the IPFS CID v0 format`)
        }

        console.log(`\n - ${metaHash}`)
        const filteredHash = 'ipfs://' + metaHash;
        const deployInfo: DeploymentInfo = await fromStorage.readBlob(filteredHash);

        if (!deployInfo) {
          throw new Error(`could not find package data on IPFS using the following hash: ${metaHash}`);
        }
        
        await toStorage.putBlob(deployInfo);

        fs.writeFile(path.join(tagsFolder, `${basePackageRef.replace(':', '_')}_${variant}.txt.meta`), filteredHash);
      }

      console.log(`\nSuccessfully fetched and saved deployment data for the following package: ${basePackageRef}`);
      console.log(`\nrun 'cannon publish ${basePackageRef} --chain-id <CHAIN_ID> --private-key <PRIVATE_KEY>' to publish the latest package data to the registry`);
  } catch (e: any) {
    throw new Error(`Error fetching from IPFS: ${e?.message}`);
  }
  
}
