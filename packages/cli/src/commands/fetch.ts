import { blueBright } from 'chalk';
import { LocalRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import {
  DeploymentInfo,
  IPFSLoader,
  CannonStorage,
  PackageReference,
  ChainDefinition,
  createInitialContext,
  getCannonRepoRegistryUrl,
} from '@usecannon/builder';
import Debug from 'debug';
import fs from 'node:fs';
import path from 'path';
import util from 'util';

const debug = Debug('cannon:cli:clean');

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

export async function fetch(packageRef: string, chainId: number, hash: string, metaHash?: string) {
  if (!/^Qm[1-9A-Za-z]{44}$/.test(hash)) {
    throw new Error(`"${hash}" does not match the IPFS CID v0 format`);
  }

  debug('resolving user settings');

  const cliSettings = resolveCliSettings();

  const { name, version, preset } = new PackageReference(packageRef);

  const localRegistry = new LocalRegistry(cliSettings.cannonDirectory);

  const storage = new CannonStorage(localRegistry, {
    ipfs: new IPFSLoader(cliSettings.ipfsUrl! || getCannonRepoRegistryUrl()),
  });

  console.log(blueBright('Fetching IPFS data from: '));
  console.log(`\n - ${hash}`);

  try {
    const ipfsUrl = 'ipfs://' + hash;

    debug('reading deploy from ipfs');

    // Fetching deployment info
    const deployInfo: DeploymentInfo = await storage.readBlob(ipfsUrl);

    const def = new ChainDefinition(deployInfo.def);

    const preCtx = await createInitialContext(def, deployInfo.meta, deployInfo.chainId || chainId, deployInfo.options);

    const pkgName = `${name}:${def.getVersion(preCtx) || version}@${preset}`;

    if (!deployInfo || Object.keys(deployInfo).length === 0) {
      throw new Error(`could not find package data on IPFS using the hash: ${hash}`);
    }

    if (name !== deployInfo.def.name) {
      throw new Error(`deployment data at ${hash} does not match the specified package "${pkgName}"`);
    }

    debug('storing deploy info');

    const deployPath = localRegistry.getTagReferenceStorage(pkgName, deployInfo.chainId || chainId);

    await storeDeployReference(deployPath, ipfsUrl);

    if (metaHash) {
      if (!/^Qm[1-9A-Za-z]{44}$/.test(metaHash)) {
        throw new Error(`"${metaHash}" does not match the IPFS CID v0 format`);
      }

      const ipfsUrl = 'ipfs://' + metaHash;

      debug('reading metadata from ipfs');

      const deployMetadataPath = localRegistry.getMetaTagReferenceStorage(pkgName, chainId);

      await storeDeployReference(deployMetadataPath, ipfsUrl);
    }

    console.log(`\n\nSuccessfully fetched and saved deployment data for the following package: ${pkgName}`);
    console.log(
      `run 'cannon publish ${pkgName} --chain-id <CHAIN_ID> --private-key <PRIVATE_KEY>' to publish the package to the registry`
    );
  } catch (e: any) {
    throw new Error(`${e?.message}`);
  }
}
