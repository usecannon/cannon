import Debug from 'debug';
import _ from 'lodash';
import { createInitialContext, getArtifacts } from './builder';
import { ChainDefinition } from './definition';
import { CannonStorage } from './runtime';
import { BundledOutput, ChainArtifacts, DeploymentInfo, StepState } from './types';

const debug = Debug('cannon:builder:package');

interface PartialRefValues {
  name: string;
  version?: string;
  preset?: string;
}

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
 * Used to format any reference to a cannon package and split it into it's core parts
 */
export class PackageReference {
  static DEFAULT_TAG = 'latest';
  static DEFAULT_PRESET = 'main';
  static PACKAGE_REGEX = /^(?<name>@?[a-z0-9][A-Za-z0-9-]{1,30}[a-z0-9])(?::(?<version>[^@]+))?(@(?<preset>[^\s]+))?$/;

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

  /**
   * Parse variant string into chainId and preset
   * @param variant string
   * @returns chainId and preset
   */
  static parseVariant(variant: string): [number, string] {
    const [chainId, preset] = variant.split(/-(.*)/s);
    return [Number(chainId), preset];
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

  // TODO: packageRef in this case can be a package name or an IPFS hash (@ipfs://Qm...) for the pin command, however, this functionality should have
  // it's own function to handle the pinning of IPFS urls.
  const packageReference = PackageReference.isValid(packageRef) ? new PackageReference(packageRef) : null;

  const presetRef = packageReference ? packageReference.preset : 'main';
  const fullPackageRef = packageReference ? packageReference.fullPackageRef : packageRef;

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

    const curFullPackageRef = `${def.getName(preCtx)}:${def.getVersion(preCtx)}@${
      context && context.preset ? context.preset : presetRef
    }`;

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

  const deployData = await fromStorage.readDeploy(fullPackageRef, chainId);

  if (!deployData) {
    throw new Error(
      `could not find deployment artifact for ${fullPackageRef} with chain id "${chainId}". Please double check your settings, and rebuild your package.`
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
