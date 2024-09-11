import Debug from 'debug';
import * as viem from 'viem';
import _ from 'lodash';
import { createInitialContext, getArtifacts } from './builder';
import { ChainDefinition } from './definition';
import { CannonStorage, ChainBuilderRuntime } from './runtime';
import { CannonRegistry } from './registry';
import { BundledOutput, ChainArtifacts, DeploymentInfo, StepState } from './types';

import { PackageReference } from './package-reference';
import { storeRead, storeWrite } from './utils/onchain-store';

const debug = Debug('cannon:builder:package');

type CopyPackageOpts = {
  packageRef: string;
  chainId: number;
  tags: string[];
  fromStorage: CannonStorage;
  toStorage: CannonStorage;
  recursive?: boolean;
  preset?: string;
  includeProvisioned?: boolean;
};

export interface PackagePublishCall {
  packagesNames: string[];
  chainId: number;
  url: string;
  metaUrl: string;
}

/**
 * Iterate Depth-First-Search over the given DeploymentInfo and its dependencies, and execute the given `action` function. Postfix execution (aka, `action` is only executed after dependants are completed).
 * Each package executes one at a time. No paralellization.
 * @param loader The loader to use for downloading sub-packages
 * @param deployInfo The head node of the tree, which will be executed on `action` last
 * @param action The action to execute
 * @param onlyResultProvisioned Only return results for packages that were provisioned. Useful when publishing. Does not prevent execution of action.
 */
export async function forPackageTree<T extends { url?: string; artifacts?: ChainArtifacts }>(
  store: CannonStorage,
  deployInfo: DeploymentInfo,
  action: (deployInfo: DeploymentInfo, context: BundledOutput | null) => Promise<T>,
  context?: BundledOutput | null,
  onlyResultProvisioned = true
): Promise<T[]> {
  const results: T[] = [];

  for (const importArtifact of _deployImports(deployInfo)) {
    const nestedDeployInfo = await store.readBlob(importArtifact.url);
    const result = await forPackageTree(store, nestedDeployInfo, action, importArtifact, onlyResultProvisioned);

    const newUrl = _.last(result)?.url;
    if (newUrl && newUrl !== importArtifact.url) {
      importArtifact.url = newUrl!;
      const updatedNestedDeployInfo = await store.readBlob(newUrl);
      // the nested artifacts (stored in this import artifact) might have changed because of the new url. if so, lets pull those changes in
      // TODO: maybe also necessary to update others besides imports? for now just keeping this as is becuase of
      importArtifact.imports = getArtifacts(
        new ChainDefinition(updatedNestedDeployInfo.def),
        updatedNestedDeployInfo.state
      ).imports;
    }

    if (!onlyResultProvisioned || importArtifact.tags) {
      results.push(...result);
    }
  }

  results.push(await action(deployInfo, context || null));

  return results;
}

function _deployImports(deployInfo: DeploymentInfo) {
  if (!deployInfo.state) return [];
  return _.flatMap(_.values(deployInfo.state), (state: StepState) => Object.values(state.artifacts.imports || {}));
}

export async function preparePublishPackage({
  packageRef,
  tags,
  chainId,
  fromStorage,
  toStorage,
  includeProvisioned = true,
}: CopyPackageOpts) {
  debug(`copy package ${packageRef} (${fromStorage.registry.getLabel()} -> ${toStorage.registry.getLabel()})`);

  const packageReference = new PackageReference(packageRef);

  const presetRef = packageReference.preset;
  const givenPackageRef = packageReference.fullPackageRef;

  const alreadyCopiedIpfs = new Map<string, any>();

  // this internal function will copy one package's ipfs records and return a publish call, without recursing
  const copyIpfs = async (deployInfo: DeploymentInfo, context: BundledOutput | null) => {
    const checkKey =
      deployInfo.def.name + ':' + deployInfo.def.version + ':' + deployInfo.def.preset + ':' + deployInfo.timestamp;

    if (alreadyCopiedIpfs.has(checkKey)) {
      return alreadyCopiedIpfs.get(checkKey);
    }

    const def = new ChainDefinition(deployInfo.def);

    const preCtx = await createInitialContext(def, deployInfo.meta, deployInfo.chainId!, deployInfo.options);

    const curFullPackageRef = new PackageReference(
      `${def.getName(preCtx)}:${def.getVersion(preCtx)}@${context && context.preset ? context.preset : presetRef}`
    ).fullPackageRef;

    // if the package has already been published to the registry and it has the same ipfs hash, skip.
    const toUrl = await toStorage.registry.getUrl(curFullPackageRef, chainId);
    debug('toStorage.getLabel: ' + toStorage.getLabel() + ' toUrl: ' + toUrl);

    const fromUrl = await fromStorage.registry.getUrl(curFullPackageRef, chainId);
    debug('fromStorage.getLabel: ' + fromStorage.getLabel() + ' fromUrl: ' + fromUrl);

    if (fromUrl && toUrl === fromUrl) {
      debug('package already published... skip!', curFullPackageRef);
      alreadyCopiedIpfs.set(checkKey, null);
      return null;
    }

    debug('copy ipfs for', curFullPackageRef, toUrl, fromUrl);

    const url = await toStorage.putBlob(deployInfo!);

    // sometimes the from url is not set because only the top level package exists. If that is the case,
    // we want to check the uploaded ipfs blob and if it matches up, then we should cancel
    debug('got updated fromUrl:' + url);
    if (toUrl === url) {
      debug('package already published (via post ipfs upload url)... skip!', curFullPackageRef);
      alreadyCopiedIpfs.set(checkKey, null);
      return null;
    }

    const newMiscUrl = await toStorage.putBlob(await fromStorage.readBlob(deployInfo!.miscUrl));

    if (newMiscUrl !== deployInfo.miscUrl) {
      debug(`WARN new misc url does not match recorded one: ${newMiscUrl} vs ${deployInfo.miscUrl}`);
    }

    // TODO: This metaUrl block is being called on each loop, but it always uses the same parameters.
    //       Should it be called outside the scoped copyIpfs() function?
    const metaUrl = await fromStorage.registry.getMetaUrl(curFullPackageRef, chainId);
    //let newMetaUrl = metaUrl;

    if (metaUrl) {
      // TODO: figure out metaurl handling
      /*newMetaUrl = await toStorage.putBlob(await fromStorage.readBlob(metaUrl));

      if (!newMetaUrl) {
        throw new Error('error while writing new misc blob');
      }*/
    }

    if (!url) {
      throw new Error('uploaded url is invalid');
    }

    const returnVal = {
      packagesNames: _.uniq([def.getVersion(preCtx) || 'latest', ...(context && context.tags ? context.tags : tags)]).map(
        (t: string) => `${def.getName(preCtx)}:${t}@${context && context.preset ? context.preset : presetRef}`
      ),
      chainId,
      url,
      metaUrl: '',
    };

    alreadyCopiedIpfs.set(checkKey, returnVal);

    return returnVal;
  };

  const deployData = await fromStorage.readDeploy(givenPackageRef, chainId);

  if (!deployData) {
    throw new Error(
      `could not find deployment artifact for ${givenPackageRef} with chain id "${chainId}". Please double check your settings, and rebuild your package.`
    );
  }

  // We call this regardless of includeProvisioned because we want to ALWAYS upload the subpackages ipfs data.
  const calls: PackagePublishCall[] = (await forPackageTree(fromStorage, deployData, copyIpfs)).filter((v: any) => !!v);

  return includeProvisioned ? calls : [_.last(calls)!];
}

/**
 * Copies package info from one storage medium to another (usually local to IPFS) and publishes it to the registry.
 */
export async function publishPackage({
  packageRef,
  tags,
  chainId,
  fromStorage,
  toStorage,
  includeProvisioned = true,
}: CopyPackageOpts) {
  const calls = await preparePublishPackage({
    packageRef,
    tags,
    chainId,
    fromStorage,
    toStorage,
    includeProvisioned,
  });

  return toStorage.registry.publishMany(calls);
}

export async function findUpgradeFromPackage(
  registry: CannonRegistry,
  provider: viem.PublicClient,
  packageReference: PackageReference,
  chainId: number,
  deployers: viem.Address[]
) {
  debug('find upgrade from onchain store');
  let oldDeployHash: string | null = null;
  let oldDelpoyTimestamp = 0;

  await Promise.all(
    deployers.map(async (addr) => {
      const [deployTimestamp, deployHash] = (
        await storeRead(
          provider,
          addr,
          viem.keccak256(viem.stringToBytes(`${packageReference.name}:${packageReference.preset}`))
        )
      ).split(':');
      if (Number(deployTimestamp) > oldDelpoyTimestamp) {
        oldDeployHash = deployHash;
        oldDelpoyTimestamp = Number(deployTimestamp);
      }
    })
  );

  if (!oldDeployHash) {
    debug('fallback: find upgrade from with registry');
    // fallback to the registry with the same package name
    oldDeployHash = await registry.getUrl(packageReference.fullPackageRef, chainId);
  }

  return oldDeployHash;
}

export async function writeUpgradeFromInfo(runtime: ChainBuilderRuntime, packageRef: PackageReference, deployUrl: string) {
  return await storeWrite(
    runtime.provider,
    await runtime.getDefaultSigner({}),
    viem.keccak256(viem.stringToBytes(`${packageRef.name}:${packageRef.preset}`)),
    deployUrl
  );
}
