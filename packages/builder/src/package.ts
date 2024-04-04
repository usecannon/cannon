import Debug from 'debug';
import _ from 'lodash';
import { createInitialContext, getArtifacts } from './builder';
import { ChainDefinition } from './definition';
import { CannonStorage } from './runtime';
import { BundledOutput, ChainArtifacts, DeploymentInfo, StepState } from './types';

const debug = Debug('cannon:cli:publish');

interface PartialRefValues {
  name: string;
  version?: string;
  preset?: string;
}

export type CopyPackageOpts = {
  packageRef: string;
  chainId: number;
  tags: string[];
  fromStorage: CannonStorage;
  toStorage: CannonStorage;
  recursive?: boolean;
  preset?: string;
  includeProvisioned?: boolean;
};

/**
 * Used to format any reference to a cannon package and split it into it's core parts
 */
export class PackageReference {
  static DEFAULT_TAG = 'latest';
  static DEFAULT_PRESET = 'main';
  static PACKAGE_REGEX = /^(?<name>@?[a-z0-9][A-Za-z0-9-]{1,29}[a-z0-9])(?::(?<version>[^@]+))?(@(?<preset>[^\s]+))?$/;

  /**
   * Anything before the colon or an @ (if no version is present) is the package name.
   */
  name: string;
  /**
   *  Anything between the colon and the @ is the package version.
   *  Defaults to 'latest' if not specified in reference
   */
  version: string;
  /**
   * Anything after the @ is the package preset.
   */
  preset: string;

  /**
   * Convenience parameter for returning packageRef with interpolated version and preset like name:version@preset
   */
  get fullPackageRef() {
    const res = `${this.name}:${this.version}@${this.preset}`;
    if (!PackageReference.isValid(res)) throw new Error(`Invalid package reference "${res}"`);
    return res;
  }

  get packageRef() {
    const res = `${this.name}:${this.version}`;
    if (!PackageReference.isValid(res)) throw new Error(`Invalid package reference "${res}"`);
    return res;
  }

  /**
   * Parse package reference without normalizing it
   */
  static parse(ref: string) {
    const match = ref.match(PackageReference.PACKAGE_REGEX);

    if (!match || !match.groups?.name) {
      throw new Error(
        `Invalid package name "${ref}". Should be of the format <package-name>:<version> or <package-name>:<version>@<preset>`
      );
    }

    const res: PartialRefValues = { name: match.groups.name };

    if (match.groups.version) res.version = match.groups.version;
    if (match.groups.preset) res.preset = match.groups.preset;

    return res;
  }

  static isValid(ref: string) {
    return !!PackageReference.PACKAGE_REGEX.test(ref);
  }

  static from(name: string, version?: string, preset?: string) {
    version = version || PackageReference.DEFAULT_TAG;
    preset = preset || PackageReference.DEFAULT_PRESET;
    return new PackageReference(`${name}:${version}@${preset}`);
  }

  constructor(ref: string) {
    const parsed = PackageReference.parse(ref);
    const { name, version = PackageReference.DEFAULT_TAG, preset = PackageReference.DEFAULT_PRESET } = parsed;

    this.name = name;
    this.version = version;
    this.preset = preset;
  }
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

    const newUrl = _.last(result)!.url;
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

export async function getProvisionedPackages(packageRef: string, chainId: number, tags: string[], storage: CannonStorage) {
  const { preset, fullPackageRef } = new PackageReference(packageRef);

  const uri = await storage.registry.getUrl(fullPackageRef, chainId);

  const deployInfo: DeploymentInfo = await storage.readBlob(uri!);

  if (!deployInfo) {
    throw new Error(
      `could not find deployment artifact for ${fullPackageRef} with chain id "${chainId}" while checking for provisioned packages. Please double check your settings, and rebuild your package.`
    );
  }

  const getPackages = async (deployInfo: DeploymentInfo, context: BundledOutput | null) => {
    debug('create chain definition');

    const def = new ChainDefinition(deployInfo.def);

    debug('create initial ctx with deploy info', deployInfo);

    const preCtx = await createInitialContext(def, deployInfo.meta, deployInfo.chainId!, deployInfo.options);

    debug('created initial ctx with deploy info');

    return {
      packagesNames: _.uniq([def.getVersion(preCtx) || 'latest', ...(context && context.tags ? context.tags : tags)]).map(
        (t: string) => `${def.getName(preCtx)}:${t}@${context && context.preset ? context.preset : preset || 'main'}`
      ),
      chainId: chainId,
      url: context?.url,
    };
  };

  return await forPackageTree(storage, deployInfo, getPackages);
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
  includeProvisioned = false,
}: CopyPackageOpts) {
  debug(`copy package ${packageRef} (${fromStorage.registry.getLabel()} -> ${toStorage.registry.getLabel()})`);

  // TODO: packageRef in this case can be a package name or an IPFS hash (@ipfs://Qm...) for the pin command, however, this functionality should have
  // it's own function to handle the pinning of IPFS urls.
  const packageReference = PackageReference.isValid(packageRef) ? new PackageReference(packageRef) : null;

  const presetRef = packageReference ? packageReference.preset : 'main';
  const fullPackageRef = packageReference ? packageReference.fullPackageRef : packageRef;

  const alreadyCopiedIpfs = new Map<string, any>();

  // this internal function will copy one package's ipfs records and return a publish call, without recursing
  const copyIpfs = async (deployInfo: DeploymentInfo, context: BundledOutput | null) => {
    const checkKey = deployInfo.def.name + ':' + deployInfo.def.version + ':' + deployInfo.timestamp;
    if (alreadyCopiedIpfs.has(checkKey)) {
      return alreadyCopiedIpfs.get(checkKey);
    }

    const newMiscUrl = await toStorage.putBlob(await fromStorage.readBlob(deployInfo!.miscUrl));

    // TODO: This metaUrl block is being called on each loop, but it always uses the same parameters.
    //       Should it be called outside the scoped copyIpfs() function?
    const metaUrl = await fromStorage.registry.getMetaUrl(fullPackageRef, chainId);
    let newMetaUrl = metaUrl;

    if (metaUrl) {
      newMetaUrl = await toStorage.putBlob(await fromStorage.readBlob(metaUrl));

      if (!newMetaUrl) {
        throw new Error('error while writing new misc blob');
      }
    }

    deployInfo.miscUrl = newMiscUrl || '';

    const url = await toStorage.putBlob(deployInfo!);

    if (!url) {
      throw new Error('uploaded url is invalid');
    }

    const def = new ChainDefinition(deployInfo.def);

    const preCtx = await createInitialContext(def, deployInfo.meta, deployInfo.chainId!, deployInfo.options);

    const returnVal = {
      packagesNames: _.uniq([def.getVersion(preCtx) || 'latest', ...(context && context.tags ? context.tags : tags)]).map(
        (t: string) => `${def.getName(preCtx)}:${t}@${context && context.preset ? context.preset : presetRef}`
      ),
      chainId,
      url,
      metaUrl: newMetaUrl || '',
    };

    alreadyCopiedIpfs.set(checkKey, returnVal);

    return returnVal;
  };

  const deployData = await fromStorage.readDeploy(fullPackageRef, chainId);

  if (!deployData) {
    throw new Error(
      `could not find deployment artifact for ${fullPackageRef} with chain id "${chainId}". Please double check your settings, and rebuild your package.`
    );
  }

  // We call this regardless of includeProvisioned because we want to ALWAYS upload the subpackages ipfs data.
  const calls = await forPackageTree(fromStorage, deployData, copyIpfs);

  if (includeProvisioned) {
    debug('publishing with provisioned');
    return toStorage.registry.publishMany(calls);
  } else {
    debug('publishing without provisioned');
    const call = _.last(calls)!;

    return toStorage.registry.publish(call.packagesNames, call.chainId, call.url, call.metaUrl);
  }
}
