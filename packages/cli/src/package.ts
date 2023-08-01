import Debug from 'debug';
import { CannonStorage, DeploymentInfo } from '@usecannon/builder';
import { promise as createQueue, queueAsPromised } from 'fastq';
import { createDefaultReadRegistry } from './registry';
import { resolveCliSettings } from './settings';
import { getMainLoader } from './loader';

const debug = Debug('cannon:cli:package');

export async function readDeploy(packageName: string, chainId: number, preset: string) {
  debug('readDeploy', packageName, chainId, preset);
  const store = await _getStore();
  return await _readDeloy(store, packageName, chainId, preset);
}

/**
 * Get a list of all the deployments recursively that are imported by the given deployment. Keep in mind
 * that it will only return unique builds, not necessarily one per import/provision.
 */
export async function readDeployRecursive(packageName: string, chainId: number, preset: string) {
  debug('readDeployTree', packageName, chainId, preset);

  const store = await _getStore();
  const deployInfo = await _readDeloy(store, packageName, chainId, preset);

  const result = new Map<string, DeploymentInfo | null>();

  const __readImports = async (info: DeploymentInfo) => {
    const importUrls = _deployImports(info).map(({ url }) => url);
    await Promise.all(importUrls.map(url => queue.push(url)));
  };

  const queue: queueAsPromised<string> = createQueue(async url => {
    if (result.has(url)) return;
    debug('readDeployTree child', url);

    result.set(url, null); // Avoid double fetching/recursion
    const info = (await store.readBlob(url)) as DeploymentInfo;
    if (!info) throw new Error(`deployment not found: ${url}`);
    result.set(url, info); // Set fetched value

    await __readImports(info);
  }, 5);

  await __readImports(deployInfo);

  return [deployInfo, ...result.values()] as DeploymentInfo[];
}

function _deployImports(deployInfo: DeploymentInfo) {
  if (!deployInfo.state) return [];
  return Object.values(deployInfo.state).flatMap(state => Object.values(state.artifacts.imports || {}));
}

async function _getStore() {
  const settings = resolveCliSettings();
  const registry = await createDefaultReadRegistry(settings);
  const loaders = getMainLoader(settings);
  return new CannonStorage(registry, loaders);
}

async function _readDeloy(store: CannonStorage, packageName: string, chainId: number, preset: string) {
  const deployInfo = await store.readDeploy(packageName, preset, chainId);

  if (!deployInfo) {
    throw new Error(`deployment data could not be downloaded for ${packageName} at ${chainId}-${preset}`);
  }

  return deployInfo;
}
