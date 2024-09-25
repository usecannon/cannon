import Debug from 'debug';
import { CannonStorage, DeploymentInfo } from '@usecannon/builder';
import { promise as createQueue, queueAsPromised } from 'fastq';
import { createDefaultReadRegistry } from './registry';
import { resolveCliSettings } from './settings';
import { getMainLoader } from './loader';

const debug = Debug('cannon:cli:package');

export async function readDeploy(packageRef: string, chainId: number) {
  debug('readDeploy', packageRef, chainId);
  const store = await _getStore();

  return await _readDeploy(store, packageRef, chainId);
}

/**
 * Get a list of all the deployments recursively that are imported by the given deployment. Keep in mind
 * that it will only return unique builds, not necessarily one per import/provision.
 */
export async function readDeployRecursive(packageRef: string, chainId: number): Promise<DeploymentInfo[]> {
  debug('readDeployTree', packageRef, chainId);

  const store = await _getStore();
  const deployInfo = await _readDeploy(store, packageRef, chainId);

  const result = new Map<string, DeploymentInfo>();

  const __readImports = async (info: DeploymentInfo) => {
    const importUrls = _deployImports(info).map(({ url }) => url);

    if (!importUrls.length) return;

    await Promise.all(importUrls.map((url) => queue.push(url)));
  };

  const queue: queueAsPromised<string> = createQueue(async (url) => {
    if (result.has(url)) return;
    debug('readDeployTree child', url);
    try {
      const info = (await store.readBlob(url)) as DeploymentInfo;

      if (!info) throw new Error(`deployment not found: ${url}`);

      result.set(url, info);
    } catch (error: unknown) {
      if (error instanceof Error) {
        debug(`Error processing ${url}: ${error.message}`);
      }
    }
  }, 5);

  await __readImports(deployInfo);

  // wait for all queued tasks to complete
  await queue.drain();

  return [deployInfo, ...Array.from(result.values())];
}

function _deployImports(deployInfo: DeploymentInfo) {
  if (!deployInfo.state) return [];
  return Object.values(deployInfo.state).flatMap((state) => Object.values(state.artifacts.imports || {}));
}

async function _getStore() {
  const settings = resolveCliSettings();
  const registry = await createDefaultReadRegistry(settings);
  const loaders = getMainLoader(settings);
  return new CannonStorage(registry, loaders);
}

async function _readDeploy(store: CannonStorage, packageRef: string, chainId: number) {
  const deployInfo = await store.readDeploy(packageRef, chainId);
  if (!deployInfo) {
    throw new Error(`deployment data could not be downloaded for ${packageRef} at ${chainId}`);
  }

  return deployInfo;
}
