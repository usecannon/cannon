import Debug from 'debug';
import { CannonStorage, DeploymentInfo } from '@usecannon/builder';

const debug = Debug('cannon:cli:prune');

export async function prune(storage: CannonStorage, packageFilter: string, variantFilter: string, keepAge: number) {
  const loaderUrls = [];
  for (const loader in storage.loaders) {
    loaderUrls.push(...(await storage.loaders[loader].list!()));
  }

  const registryUrls = await storage.registry.getAllUrls(packageFilter, variantFilter);

  if (!registryUrls.size) {
    throw new Error('registry does not show any package urls. this is likely an error');
  }

  const now = Math.floor(Date.now() / 1000);

  const pruneUrls = new Set<string>();
  const keepUrls = new Set<string>();

  // find any cannon package-like objects in the repo and remove them if they are older than timestmap
  // package can be removed from repo if:
  // 1. its a valid cannon package
  // 2. its not included in the registry
  // 3. its older than a timestamp
  // additionally
  for (const url of loaderUrls) {
    try {
      const deployInfo = (await storage.readBlob(url)) as DeploymentInfo;
      if (!deployInfo.generator.startsWith('cannon ')) {
        throw new Error(`not correct generator ${deployInfo.generator}`);
      }

      if (!registryUrls.has(url) && deployInfo.timestamp < now - keepAge) {
        debug(`add to prune urls: ${url} ${deployInfo.timestamp}`);
        pruneUrls.add(url);
        pruneUrls.add(deployInfo.miscUrl);
      } else {
        keepUrls.add(deployInfo.miscUrl);
      }
    } catch (err: any) {
      debug(`not cannon artifact, ${url}: ${err.toString()}`);
    }
  }

  for (const keepUrl of keepUrls) {
    pruneUrls.delete(keepUrl);
  }

  return Array.from(pruneUrls);
}
