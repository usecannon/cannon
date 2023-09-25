import { blueBright } from 'chalk';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { getMainLoader } from '../loader';
import { DeploymentInfo, CannonStorage, IPFSLoader, PackageReference } from '@usecannon/builder';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function fetch(packageRef: string, hash: string, metaHash?: string) {
  const cliSettings = resolveCliSettings();

  const { name, version, preset, basePackageRef } = new PackageReference(packageRef);

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);
  const fromStorage = new CannonStorage(localRegistry, {
    ipfs: new IPFSLoader(cliSettings.publishIpfsUrl || cliSettings.ipfsUrl!),
  });
  const toStorage = new CannonStorage(localRegistry, getMainLoader(cliSettings));
  
  console.log(blueBright('Fetching IPFS data from: '));
  console.log(`\n - ${hash}`)
  
  try {
      const filteredHash = 'ipfs://' + hash;
      const deployInfo: DeploymentInfo = await fromStorage.readBlob(filteredHash);

      if (!deployInfo) {
        throw new Error(`could not find package data on IPFS using the following hash: ${hash}`)
      }
      
      await toStorage.putBlob(deployInfo)

      const variant = `${deployInfo.chainId}-${preset || 'main'}`

      const tagsFolder = path.join(cliSettings.cannonDirectory, 'tags');

      fs.writeFile(path.join(tagsFolder, `${basePackageRef.replace(':', '_')}_${variant}.txt`), filteredHash)

      if (metaHash) {
        console.log(`\n - ${metaHash}`)
        const filteredHash = 'ipfs://' + metaHash;
        const deployInfo: DeploymentInfo = await fromStorage.readBlob(filteredHash);

        if (!deployInfo) {
          throw new Error(`could not find package data on IPFS using the following hash: ${metaHash}`)
        }
        
        await toStorage.putBlob(deployInfo)

        fs.writeFile(path.join(tagsFolder, `${basePackageRef.replace(':', '_')}_${variant}.txt.meta`), filteredHash)
      }

      console.log(`\nSuccessfully fetched and saved deployment data for the following package: ${basePackageRef}`)
      console.log(`\nrun 'cannon publish ${basePackageRef} --chain-id <CHAIN_ID> --private-key <PRIVATE_KEY>' to publish the latest package data to the registry`)
  } catch (e: any) {
    throw new Error(`Error fetching from IPFS: ${e?.message}`);
  }
  
}
