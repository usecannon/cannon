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

import { logSpinner, warnSpinner } from '../util/console';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';

import { yellow, bold } from 'chalk';

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

export async function fetch(fullPackageRef: string | null, chainId: number | null, _ipfsUrl: string, _metaIpfsUrl?: string) {
  const ipfsUrl = getIpfsUrl(_ipfsUrl);
  const metaIpfsUrl = getIpfsUrl(_metaIpfsUrl);

  if (!ipfsUrl) {
    throw new Error('IPFS URL is required.');
  }

  debug('resolving user settings');

  const cliSettings = resolveCliSettings();

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);

  const storage = new CannonStorage(localRegistry, {
    ipfs: new IPFSLoader(cliSettings.publishIpfsUrl! || getCannonRepoRegistryUrl()),
  });

  logSpinner(blueBright('Fetching IPFS data from: '));
  logSpinner(`\n - ${ipfsUrl}`);

  debug('reading deploy from ipfs');

  // Fetching deployment info
  const deployInfo: DeploymentInfo = await storage.readBlob(ipfsUrl);

  if (!deployInfo || Object.keys(deployInfo).length === 0) {
    throw new Error(
      `Could not find package data on IPFS using the hash: ${ipfsUrl}\n` +
      `Please verify that:\n` +
      `  - The IPFS hash is correct\n` +
      `  - The IPFS gateway is accessible\n` +
      `  - The hash contains valid Cannon package data`
    );
  }

  const def = new ChainDefinition(deployInfo.def);
  const preCtx = await createInitialContext(def, deployInfo.meta, deployInfo.chainId || chainId || 13370, deployInfo.options);

  let name: string, version: string, preset: string;

  let packageRef = '';
  if (fullPackageRef) {
    // Package reference was provided, validate it matches the IPFS data
    const ref = new PackageReference(fullPackageRef);

    if (ref.name !== deployInfo.def.name) {
      warnSpinner(yellow('The IPFS package you downloaded is being saved to a different name than is recorded in the package data. Please double check to make sure this is correct.'));
      warnSpinner(yellow(bold(`Package Name (IPFS Data): ${deployInfo.def.name}`)))
      warnSpinner(yellow(bold(`Provided Name:            ${ref.name}`)))
    } else if (ref.version !== deployInfo.def.version) {
      warnSpinner(yellow('The IPFS package you downloaded is being saved to a different version than is recorded in the package data. Please double check to make sure that this is correct.'));
      warnSpinner(yellow(bold(`Package Version (IPFS Data): ${deployInfo.def.version}`)))
      warnSpinner(yellow(bold(`Provided Version:            ${ref.version}`)))
    } else if (deployInfo.chainId && chainId !== deployInfo.chainId) {
      warnSpinner(yellow('The IPFS package you downloaded is being saved to a different chain ID than is recorded in the package data. Please double check to make sure that this is correct.'));
      warnSpinner(yellow(bold(`Chain ID (IPFS Data):    ${deployInfo.chainId}`)))
      warnSpinner(yellow(bold(`Chain ID (User Input):   ${chainId}`)))
    }

    packageRef = fullPackageRef;
  } else {
    // Auto-detect package information from IPFS data
    packageRef = new PackageReference(`${deployInfo.def.name}:${def.getVersion(preCtx) || 'latest'}@${def.getPreset(preCtx)}`).fullPackageRef;

    log(`\nDetected package: ${packageRef}`);
  }

  debug('storing deploy info');

  const resolvedChainId = chainId || deployInfo.chainId || 13370;

  const deployPath = localRegistry.getTagReferenceStorage(packageRef, resolvedChainId);

  await storeDeployReference(deployPath, ipfsUrl);

  if (metaIpfsUrl) {
    debug('reading metadata from ipfs');
    const deployMetadataPath = localRegistry.getMetaTagReferenceStorage(packageRef, resolvedChainId);
    await storeDeployReference(deployMetadataPath, metaIpfsUrl);
  }

  logSpinner(`\n\nSuccessfully fetched and saved deployment data for the following package: ${pkgName}`);
  logSpinner(
    `run 'cannon publish ${pkgName} --chain-id <CHAIN_ID> --private-key <PRIVATE_KEY>' to publish the package to the registry`
  );
}
