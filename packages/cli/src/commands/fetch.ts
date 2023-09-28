import { blueBright } from 'chalk';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { getMainLoader } from '../loader';
import { DeploymentInfo, CannonStorage, IPFSLoader, PackageReference } from '@usecannon/builder';
import fs from 'node:fs/promises';

export async function fetch(packageRef: string, hash: string, metaHash?: string) {
  if (!/^Qm[1-9A-Za-z]{44}$/.test(hash)) {
    throw new Error(`"${hash}" does not match the IPFS CID v0 format`)
  }

  const cliSettings = resolveCliSettings();

  const { name, preset, basePackageRef } = new PackageReference(packageRef);

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);
  const storage = new CannonStorage(localRegistry, getMainLoader(cliSettings));
  
  console.log(blueBright('Fetching IPFS data from: '));
  console.log(`\n - ${hash}`);
  
  try {
      const ipfsUrl = 'ipfs://' + hash;

      // Fetching deployment info
      const deployInfo: DeploymentInfo = await storage.readBlob(ipfsUrl);

      if (!deployInfo || Object.keys(deployInfo).length === 0) {
        throw new Error(`could not find package data on IPFS using the following hash: ${hash}`);
      }

      if (name !== deployInfo.def.name) {
        throw new Error(`deployment data at ${hash} does not match the specified package, `);
      }
      
      // Writing deployment blobs directory
      await storage.putBlob(deployInfo);

      const variant = `${deployInfo.chainId}-${preset || 'main'}`

       fs.writeFile(localRegistry.getTagReferenceStorage(basePackageRef, variant), ipfsUrl)

      if (metaHash) {
        if (!/^Qm[1-9A-Za-z]{44}$/.test(metaHash)) {
          throw new Error(`"${metaHash}" does not match the IPFS CID v0 format`)
        }

        const ipfsUrl = 'ipfs://' + metaHash;
        const deployInfo: DeploymentInfo = await storage.readBlob(ipfsUrl);
        
        if (Object.keys(deployInfo).length === 0) {
          console.log(`\nPackage does not have any metadata at ${ipfsUrl}`);
        } else {
          console.log(`\n - ${metaHash}`)
  
          if (!deployInfo) {
            throw new Error(`could not find package metadata on IPFS using the following hash: ${metaHash}`);
          }
          
          await storage.putBlob(deployInfo);
  
          fs.writeFile(localRegistry.getMetaTagReferenceStorage(basePackageRef, variant), ipfsUrl);
        }
      }

      console.log(`\n\nSuccessfully fetched and saved deployment data for the following package: ${basePackageRef}`);
      console.log(`run 'cannon publish ${basePackageRef} --chain-id <CHAIN_ID> --private-key <PRIVATE_KEY>' to publish the latest package data to the registry`);
  } catch (e: any) {
    throw new Error(`Error fetching from IPFS: ${e?.message}`);
  }
  
}
