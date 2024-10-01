import Debug from 'debug';
import { CannonStorage, DeploymentInfo } from '@usecannon/builder';
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

  const result = new Map<string, DeploymentInfo | null>();

  async function processDeployment(info: DeploymentInfo): Promise<void> {
    const importUrls = _deployImports(info).map(({ url }) => url);

    await Promise.all(
      importUrls.map(async (url) => {
        if (result.has(url)) return;

        debug('readDeployTree child', url);
        try {
          // Avoid double fetching/recursion, by setting an empty value
          // result.has(url) is going to return true before finishing the readBlob call.
          result.set(url, null);

          const childInfo = (await store.readBlob(url)) as DeploymentInfo;
          if (!childInfo) throw new Error(`deployment not found: ${url}`);

          result.set(url, childInfo);
          await processDeployment(childInfo);
        } catch (error) {
          if (error instanceof Error) {
            debug(`Error processing ${url}: ${error.message}`);
          } else {
            debug(`Error processing ${url}: ${error}`);
          }
        }
      })
    );
  }

  try {
    await processDeployment(deployInfo);
  } catch (error) {
    debug('Error processing deployments:', error);
  }

  return [deployInfo, ...Array.from(result.values()).filter((val) => !!val)];
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
