import Debug from 'debug';
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
};

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

  constructor(ref: string) {
    this.ref = ref;

    const packageRegExp = /^(?<name>@?[\w-]+)(?::(?<version>[^@]+))?(@(?<preset>[^\s]+))?$/;
    const match = this.ref.match(packageRegExp);

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
export async function forPackageTree<T>(
  store: CannonStorage,
  deployInfo: DeploymentInfo,
  action: (deployInfo: DeploymentInfo, context: BundledOutput | null) => Promise<T>,
  context?: BundledOutput | null,
  onlyProvisioned = true
): Promise<T[]> {
  const results: T[] = [];

  for (const importArtifact of _deployImports(deployInfo)) {
    if (onlyProvisioned && !importArtifact.tags) continue;
    const nestedDeployInfo = await store.readBlob(importArtifact.url);
    const result = await forPackageTree(store, nestedDeployInfo, action, importArtifact, onlyProvisioned);
    results.push(...result);
  }

  results.push(await action(deployInfo, context || null));

  return results;
}

function _deployImports(deployInfo: DeploymentInfo) {
  if (!deployInfo.state) return [];
  return Object.values(deployInfo.state).flatMap((state) => Object.values(state.artifacts.imports || {}));
}

export async function copyPackage({ packageRef, tags, variant, fromStorage, toStorage, recursive }: CopyPackageOpts) {
  const { basePackageRef } = new PackageReference(packageRef);

  debug(`copy package ${packageRef} (${fromStorage.registry.getLabel()} -> ${toStorage.registry.getLabel()})`);

  const chainId = parseInt(variant.split('-')[0]);

    // TODO: This metaUrl block is being called on each loop, but it always uses the same parameters.
    //       Should it be called outside the scoped copyIpfs() function?
    const metaUrl = await fromStorage.registry.getMetaUrl(basePackageRef, variant);
    let newMetaUrl = metaUrl;

  // this internal function will copy one package's ipfs records and return a publish call, without recursing
  const copyIpfs = async (deployInfo: DeploymentInfo, context: BundledOutput | null) => {
    const newMiscUrl = await toStorage.putBlob(await fromStorage.readBlob(deployInfo!.miscUrl));

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

    const preCtx = await createInitialContext(def, deployInfo.meta, 0, deployInfo.options);

    return {
      packagesNames: [def.getVersion(preCtx), ...(context ? context.tags || [] : tags)].map(
        (t) => `${def.getName(preCtx)}:${t}`
      ),
      variant: context ? `${chainId}-${context.preset}` : variant,
      url,
      metaUrl: newMetaUrl || '',
    };
  };

  const preset = variant.substring(variant.indexOf('-') + 1);

  const deployData = await fromStorage.readDeploy(basePackageRef, preset, chainId);

  if (!deployData) {
    throw new Error('ipfs could not find deployment artifact. please double check your settings, and rebuild your package.');
  }

  if (recursive) {
    const calls = await forPackageTree(fromStorage, deployData, copyIpfs);
    return toStorage.registry.publishMany(calls);
  } else {
    const call = await copyIpfs(deployData, null);

    return toStorage.registry.publish(call.packagesNames, call.variant, call.url, call.metaUrl);
  }
}
