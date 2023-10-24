import Debug from 'debug';
import _ from 'lodash';
import { BundledOutput, DeploymentInfo } from './types';
import { ChainDefinition } from './definition';
import { createInitialContext } from './builder';
import { CannonStorage } from './runtime';

const debug = Debug('cannon:cli:publish');

export type CopyPackageOpts = {
  packageRef: string;
  variant: string;
  tags: string[];
  fromStorage: CannonStorage;
  toStorage: CannonStorage;
  recursive?: boolean;
  includeProvisioned?: boolean;
};

const PKG_REG_EXP = /^(?<name>@?[a-z0-9][a-z0-9-]{1,29}[a-z0-9])(?::(?<version>[^@]+))?(@(?<preset>[^\s]+))?$/;

/**
 * Used to format any reference to a cannon package and split it into it's core parts
 */
export class PackageReference {
  private ref: string;
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
  preset?: string;

  /**
   * Convenience parameter for returning base package format without preset **[name]:[version]**
   */
  basePackageRef: string;

  static isValid(ref: string) {
    return !!PKG_REG_EXP.test(ref);
  }

  constructor(ref: string) {
    this.ref = ref;

    const match = this.ref.match(PKG_REG_EXP);

    if (!match) {
      throw new Error(
        `Invalid package name "${this.ref}". Should be of the format <package-name>:<version> or <package-name>:<version>@<preset>`
      );
    }

    const { name, version = 'latest', preset } = match.groups!;

    this.name = name;
    this.version = version;
    this.preset = preset;

    this.basePackageRef = `${this.name}:${this.version}`;
  }
}

/**
 * Iterate Depth-First-Search over the given DeploymentInfo and its dependencies, and execute the given `action` function. Postfix execution (aka, `action` is only executed after dependants are completed).
 * Each package executes one at a time. No paralellization.
 * @param loader The loader to use for downloading sub-packages
 * @param deployInfo The head node of the tree, which will be executed on `action` last
 * @param action The action to execute
 * @param onlyProvisioned Skip over sub-packages which are not provisioned within the parent
 */
export async function forPackageTree<T extends { url?: string }>(
  store: CannonStorage,
  deployInfo: DeploymentInfo,
  action: (deployInfo: DeploymentInfo, context: BundledOutput | null) => Promise<T>,
  context?: BundledOutput | null,
  onlyProvisioned = true
): Promise<T[]> {
  const results: T[] = [];

  for (const importArtifact of _deployImports(deployInfo)) {
    // TODO: if we ever have anything besides IPFS for deployment on the registry, this should be updated
    if (onlyProvisioned && !importArtifact.tags && importArtifact.url && importArtifact.url.split(':')[0] === 'ipfs')
      continue;
    const nestedDeployInfo = await store.readBlob(importArtifact.url);
    const result = await forPackageTree(store, nestedDeployInfo, action, importArtifact, onlyProvisioned);
    if (_.last(result)!.url) {
      importArtifact.url = _.last(result)!.url!;
    }
    results.push(...result);
  }

  results.push(await action(deployInfo, context || null));

  return results;
}

function _deployImports(deployInfo: DeploymentInfo) {
  if (!deployInfo.state) return [];
  return Object.values(deployInfo.state).flatMap((state) => Object.values(state.artifacts.imports || {}));
}

export async function getProvisionedPackages(packageRef: string, variant: string, tags: string[], storage: CannonStorage) {
  const chainId = parseInt(variant.split('-')[0]);

  const uri = await storage.registry.getUrl(packageRef, variant);

  const deployInfo: DeploymentInfo = await storage.readBlob(uri!);

  if (!deployInfo) {
    throw new Error(
      `could not find deployment artifact for ${packageRef} while checking for provisioned packages. Please double check your settings, and rebuild your package.`
    );
  }

  const getPackages = async (deployInfo: DeploymentInfo, context: BundledOutput | null) => {
    debug('create chain definition');

    const def = new ChainDefinition(deployInfo.def);

    debug('create initial ctx with deploy info', deployInfo);

    const preCtx = await createInitialContext(def, deployInfo.meta, deployInfo.chainId!, deployInfo.options);

    debug('created initial ctx with deploy info');

    return {
      packagesNames: [def.getVersion(preCtx) || 'latest', ...(context ? context.tags || [] : tags)].map(
        (t) => `${def.getName(preCtx)}:${t}`
      ),
      variant: context ? `${chainId}-${context.preset}` : variant,
      url: context?.url
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
  variant,
  fromStorage,
  toStorage,
  includeProvisioned = false,
}: CopyPackageOpts) {
  debug(`copy package ${packageRef} (${fromStorage.registry.getLabel()} -> ${toStorage.registry.getLabel()})`);

  const chainId = parseInt(variant.split('-')[0]);

  // this internal function will copy one package's ipfs records and return a publish call, without recursing
  const copyIpfs = async (deployInfo: DeploymentInfo, context: BundledOutput | null) => {
    const newMiscUrl = await toStorage.putBlob(await fromStorage.readBlob(deployInfo!.miscUrl));

    // TODO: This metaUrl block is being called on each loop, but it always uses the same parameters.
    //       Should it be called outside the scoped copyIpfs() function?
    const metaUrl = await fromStorage.registry.getMetaUrl(packageRef, variant);
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

    return {
      packagesNames: [def.getVersion(preCtx) || 'latest', ...(context ? context.tags || [] : tags)].map(
        (t) => `${def.getName(preCtx)}:${t}`
      ),
      variant: context ? `${chainId}-${context.preset}` : variant,
      url,
      metaUrl: newMetaUrl || '',
    };
  };

  const preset = variant.substring(variant.indexOf('-') + 1);

  const deployData = await fromStorage.readDeploy(packageRef, preset, chainId);

  if (!deployData) {
    throw new Error(
      `could not find deployment artifact for ${packageRef}. Please double check your settings, and rebuild your package.`
    );
  }

  if (includeProvisioned) {
    debug('publish with provisioned');
    const calls = await forPackageTree(fromStorage, deployData, copyIpfs);

    return toStorage.registry.publishMany(calls);
  } else {
    debug('publish without provisioned');
    const call = await copyIpfs(deployData, null);

    return toStorage.registry.publish(call.packagesNames, call.variant, call.url, call.metaUrl);
  }
}
