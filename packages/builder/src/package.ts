import { DeploymentInfo, StepState } from './types';
import { CannonLoader } from './loader';
import { ChainDefinition } from './definition';
import { createInitialContext } from './builder';

export type CopyPackageOpts = {
  packageRef: string;
  variant: string;
  tags: string[];
  fromLoader: CannonLoader;
  toLoader: CannonLoader;
  recursive?: boolean;
};

/**
 * Iterate Depth-First-Search over the given DeploymentInfo and its dependencies, and execute the given `action` function. Postfix execution (aka, `action` is only executed after dependants are completed).
 * Each package executes one at a time. No paralellization.
 * @param loader The loader to use for downloading sub-packages
 * @param deployInfo The head node of the tree, which will be executed on `action` last
 * @param action The action to execute
 * @param onlyProvisioned Skip over sub-packages which are not provisioned within the parent
 */
export async function forPackageTree<T>(
  loader: CannonLoader,
  deployInfo: DeploymentInfo,
  action: (deployInfo: DeploymentInfo) => Promise<T>,
  onlyProvisioned = true
): Promise<T[]> {
  const results: T[] = [];

  for (const stepState of Object.entries(deployInfo.state || {})) {
    for (const importArtifact of Object.entries((stepState[1] as StepState).artifacts.imports || {})) {
      const nestedDeployInfo = await loader.readMisc(importArtifact[1].url);
      await forPackageTree(loader, nestedDeployInfo, action, onlyProvisioned);
    }
  }

  results.push(await action(deployInfo));

  return results;
}

export async function copyPackage({ packageRef, tags, variant, fromLoader, toLoader, recursive }: CopyPackageOpts) {
  // this internal function will copy one package's ipfs records and return a publish call, without recursing
  const copyIpfs = async (deployInfo: DeploymentInfo) => {
    const miscUrl = await toLoader.putMisc(await fromLoader.readMisc(deployData!.miscUrl));

    const metaUrl = await fromLoader.resolver.getMetaUrl(packageRef, variant);
    let newMetaUrl = metaUrl;

    if (metaUrl) {
      newMetaUrl = await toLoader.putMisc(await fromLoader.readMisc(metaUrl));
    }
    const url = await toLoader.putDeploy(deployData!);

    if (!url || /*url !== toPublishUrl || */ newMetaUrl !== metaUrl || miscUrl !== deployInfo.miscUrl) {
      throw new Error('re-deployed urls do not match up');
    }

    const def = new ChainDefinition(deployInfo.def);

    const preCtx = await createInitialContext(def, deployInfo.meta, 0, deployInfo.options);

    return {
      packagesNames: [def.getVersion(preCtx), ...tags].map((t) => `${def.getName(preCtx)}:${t}`),
      variant,
      url,
      metaUrl: metaUrl || '',
    };
  };

  const chainId = parseInt(variant.split('-')[0]);
  const preset = variant.substring(variant.indexOf('-') + 1);

  const deployData = await fromLoader.readDeploy(packageRef, preset, chainId);

  if (!deployData) {
    throw new Error('ipfs could not find deployment artifact. please double check your settings, and rebuild your package.');
  }

  if (recursive) {
    const calls = await forPackageTree(fromLoader, deployData, copyIpfs);
    return toLoader.resolver.publishMany(calls);
  } else {
    const call = await copyIpfs(deployData);

    return toLoader.resolver.publish(call.packagesNames, call.variant, call.url, call.metaUrl);
  }
}
