import { blueBright } from 'chalk';
import {
  DeploymentInfo,
  IPFSLoader,
  CannonStorage,
  PackageReference,
  ChainDefinition,
  createInitialContext,
  getCannonRepoRegistryUrl,
  getIpfsUrl,
} from '@usecannon/builder';
import Debug from 'debug';
import fs from 'node:fs';
import path from 'path';
import util from 'util';

import { log } from '../util/console';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';

const debug = Debug('cannon:cli:fetch');

const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);

/**
  Function used to store references in the tags directory.\
  Recursively creates parent directories if they do not exist and writes to file
*/
async function storeDeployReference(filePath: string, content: string) {
  const dir = path.dirname(filePath);

  try {
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, content);
  } catch (error) {
    throw new Error(`Error creating file: ${error}`);
  }
}

export async function fetch(fullPackageRef: string, chainId: number, _ipfsUrl: string, _metaIpfsUrl?: string) {
  const ipfsUrl = getIpfsUrl(_ipfsUrl);
  const metaIpfsUrl = getIpfsUrl(_metaIpfsUrl);

  if (!ipfsUrl) {
    throw new Error('IPFS URL is required.');
  }

  debug('resolving user settings');

  const cliSettings = resolveCliSettings();

  const { name, version, preset } = new PackageReference(fullPackageRef);

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);

  const storage = new CannonStorage(localRegistry, {
    ipfs: new IPFSLoader(cliSettings.publishIpfsUrl! || getCannonRepoRegistryUrl()),
  });

  log(blueBright('Fetching IPFS data from: '));
  log(`\n - ${ipfsUrl}`);

  debug('reading deploy from ipfs');

  // Fetching deployment info
  const deployInfo: DeploymentInfo = await storage.readBlob(ipfsUrl);

  const def = new ChainDefinition(deployInfo.def);

  const preCtx = await createInitialContext(def, deployInfo.meta, deployInfo.chainId || chainId, deployInfo.options);

  const pkgName = `${name}:${def.getVersion(preCtx) || version}@${preset}`;

  if (!deployInfo || Object.keys(deployInfo).length === 0) {
    throw new Error(`could not find package data on IPFS using the hash: ${ipfsUrl}`);
  }

  if (name !== deployInfo.def.name) {
    throw new Error(`deployment data at ${ipfsUrl} does not match the specified package "${pkgName}"`);
  }

  debug('storing deploy info');

  const deployPath = localRegistry.getTagReferenceStorage(pkgName, deployInfo.chainId || chainId);

  await storeDeployReference(deployPath, ipfsUrl);

  if (metaIpfsUrl) {
    debug('reading metadata from ipfs');
    const deployMetadataPath = localRegistry.getMetaTagReferenceStorage(pkgName, chainId);
    await storeDeployReference(deployMetadataPath, metaIpfsUrl);
  }

  log(`\n\nSuccessfully fetched and saved deployment data for the following package: ${pkgName}`);
  log(
    `run 'cannon publish ${pkgName} --chain-id <CHAIN_ID> --private-key <PRIVATE_KEY>' to publish the package to the registry`
  );
}
