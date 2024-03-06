import Debug from 'debug';
import { CannonStorage, DeploymentInfo } from '@usecannon/builder';

const debug = Debug('cannon:cli:prune');
const debugVerbose = Debug('cannon:cli:prune:verbose');

export interface PruneStats {
  deletedSize: number;
  matchedFromRegistry: number;
  notExpired: number;
  notCannonPackage: number;
}

function normalizeMiscUrl(miscUrl: string): string {
  return miscUrl && miscUrl.startsWith('Qm') ? 'ipfs://' + miscUrl : miscUrl;
}

export async function prune(
  storage: CannonStorage,
  packageFilters: string[],
  chainIds: number[],
  keepAge: number
): Promise<[string[], PruneStats]> {
  const loaderUrls = [];
  for (const loader in storage.loaders) {
    debug('load pins from loader', loader);
    loaderUrls.push(...(await storage.loaders[loader].list!()));
  }

  const registryUrls: Set<string> = new Set();
  if (!packageFilters) {
    debug('load all urls from registry');
    (await storage.registry.getAllUrls()).forEach(registryUrls.add, registryUrls);
  }
  for (const packageFilter of packageFilters) {
    debug('load urls from registry', packageFilter);
    if (!chainIds.length) {
      (await storage.registry.getAllUrls(packageFilter)).forEach(registryUrls.add, registryUrls);
    } else {
      for (const chainId of chainIds) {
        (await storage.registry.getAllUrls(packageFilter, chainId)).forEach(registryUrls.add, registryUrls);
      }
    }
  }

  debug(`loaded ${registryUrls.size} urls from registry, filters ${JSON.stringify(packageFilters)}`);

  if (packageFilters.length && !registryUrls.size) {
    throw new Error('registry does not show any package urls. this is likely an error');
  }

  const now = Math.floor(Date.now() / 1000);

  const pruneUrls = new Set<string>();
  const keepUrls = new Set<string>();

  // todo: better stats in the future
  const pruneStats: PruneStats = {
    deletedSize: 0,
    matchedFromRegistry: 0,
    notExpired: 0,
    notCannonPackage: 0,
  };

  // find any cannon package-like objects in the repo and remove them if they are older than timestmap
  // package can be removed from repo if:
  // 1. its a valid cannon package
  // 2. its not included in the registry
  // 3. its older than a timestamp
  for (const url of loaderUrls) {
    try {
      const deployInfo = (await storage.readBlob(url)) as DeploymentInfo;

      if (!deployInfo.generator || !deployInfo.generator.startsWith('cannon ')) {
        debug(`${url}: parsed, but not cannon package`);
        pruneStats.notCannonPackage++;
      } else if (deployInfo.timestamp && deployInfo.timestamp >= now - keepAge) {
        debug(`${url}: not expired (${deployInfo.timestamp}, ${now - keepAge})`);
        pruneStats.notExpired++;
        keepUrls.add(normalizeMiscUrl(deployInfo.miscUrl));
      } else if (registryUrls.has(url)) {
        debug(`${url}: matched from registry`);
        pruneStats.matchedFromRegistry++;
        keepUrls.add(normalizeMiscUrl(deployInfo.miscUrl));
      } else {
        debug(
          `${url}: prune (${deployInfo.timestamp ? new Date(deployInfo.timestamp * 1000).toISOString() : 'no timestamp'})`
        );
        pruneUrls.add(url);
        if (deployInfo.miscUrl) {
          debug(`${normalizeMiscUrl(deployInfo.miscUrl)}: prune as miscUrl`);
          pruneUrls.add(normalizeMiscUrl(deployInfo.miscUrl));
        }
      }
    } catch (err: any) {
      debug(`${url}: not cannon artifact`);
      debugVerbose(err);
    }
  }

  debug('keeping urls', keepUrls.size);
  debug('pre delete from prune urls', pruneUrls.size);
  for (const keepUrl of keepUrls) {
    pruneUrls.delete(keepUrl);
  }
  debug('post delete from prune urls', pruneUrls.size);

  return [Array.from(pruneUrls), pruneStats];
}
