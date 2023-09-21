import { blueBright } from 'chalk';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { getMainLoader } from '../loader';
import { DeploymentInfo, CannonStorage } from '@usecannon/builder';

export async function fetch(hash: string) {
  const cliSettings = resolveCliSettings();

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);
  const localStorage = new CannonStorage(localRegistry, getMainLoader(cliSettings));
  
  console.log(blueBright('Fetching IPFS data from: '));
  
  try {
      console.log(`\n - ${hash}`)
      let filteredHash = 'ipfs://' + hash;
      const deployInfo: DeploymentInfo = await localStorage.readBlob(filteredHash);
      
      await localStorage.putBlob(deployInfo)
      const packageName = `${deployInfo!.def.name}`

      console.log(`\nSuccessfully fetched and saved deployment data for the following package: ${packageName}`)
      console.log(`\nrun 'cannon publish ${packageName} --chain-id <CHAIN_TO_DEPLOY_TO>' to publish the latest package data to the registry`)
  } catch (e: any) {
    throw new Error(`Error fetching from IPFS: ${e?.message}`);
  }
  
}
