import Debug from 'debug';
import { CannonStorage, DeploymentInfo } from '@usecannon/builder';

const debug = Debug('cannon:cli:prune');
const debugVerbose = Debug('cannon:cli:prune:verbose');

export interface PruneStats {
  deletedSize: number;
}

export async function prune(
  storage: CannonStorage,
  packageFilter: string,
  variantFilter: string,
  keepAge: number
): Promise<[string[], PruneStats]> {
  const loaderUrls = [];
  for (const loader in storage.loaders) {
    debug('load pins from loader', loader);
    loaderUrls.push(...(await storage.loaders[loader].list!()));
  }

  debug('load urls from registry');
  const registryUrls = await storage.registry.getAllUrls(packageFilter, variantFilter);
  debug(`loaded ${registryUrls.size} urls from registry`);

  if (packageFilter && !registryUrls.size) {
    throw new Error('registry does not show any package urls. this is likely an error');
  }

  const now = Math.floor(Date.now() / 1000);

  const pruneUrls = new Set<string>();
  const keepUrls = new Set<string>();

  // todo: better stats in the future
  const pruneStats: PruneStats = {
    deletedSize: 0,
  };

  // find any cannon package-like objects in the repo and remove them if they are older than timestmap
  // package can be removed from repo if:
  // 1. its a valid cannon package
  // 2. its not included in the registry
  // 3. its older than a timestamp
  for (const url of loaderUrls) {
    try {
      const deployInfo = (await storage.readBlob(url)) as DeploymentInfo;

      if (
        (!deployInfo.generator || (deployInfo.generator.startsWith('cannon ') && deployInfo.timestamp < now - keepAge)) &&
        !registryUrls.has(url)
      ) {
        debug(`add to prune urls: ${url} ${deployInfo.miscUrl} (${deployInfo.timestamp})`);
        pruneUrls.add(url);
        if (deployInfo.miscUrl) pruneUrls.add(deployInfo.miscUrl);
      } else {
        keepUrls.add(deployInfo.miscUrl);
      }
    } catch (err: any) {
      debug(`not cannon artifact, ${url}`);
      debugVerbose(err);
    }
  }

  for (const keepUrl of keepUrls) {
    pruneUrls.delete(keepUrl);
  }

  return [Array.from(pruneUrls), pruneStats];
}
