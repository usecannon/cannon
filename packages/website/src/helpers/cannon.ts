import MulticallABI from '@/abi/Multicall.json';
import * as git from '@/helpers/git';
import toml from '@iarna/toml';
import path from '@isomorphic-git/lightning-fs/src/path';
import {
  CANNON_CHAIN_ID,
  ChainBuilderContext,
  ChainDefinition,
  InMemoryLoader,
  InMemoryRegistry,
  RawChainDefinition,
  TransactionMap,
} from '@usecannon/builder';
import _ from 'lodash';
import {
  Address,
  decodeAbiParameters,
  decodeFunctionData,
  Hex,
  parseAbiParameters,
  isAddressEqual,
  zeroAddress,
} from 'viem';

import * as onChainStore from '@/helpers/onchain-store';

export type CannonTransaction = TransactionMap[keyof TransactionMap];

export interface StepExecutionError {
  name: string;
  err: Error;
}

/* eslint no-console: "off" */

export const inMemoryRegistry = new InMemoryRegistry();
export const inMemoryLoader = new InMemoryLoader(Math.floor(Math.random() * 100000));

export async function loadCannonfile(repo: string, ref: string, filepath: string) {
  const filesList = new Set<string>();
  const [rawDef, buf] = await loadChainDefinitionToml(repo, ref, filepath, [], filesList);
  const def = new ChainDefinition(rawDef as RawChainDefinition);
  //const pkg = loadPackageJson(path.join(path.dirname(filepath), 'package.json'));

  const ctx: ChainBuilderContext = {
    package: {},
    chainId: CANNON_CHAIN_ID,
    settings: {},
    timestamp: 0,
    contracts: {},
    txns: {},
    imports: {},
    overrideSettings: {},
  };

  const name = def.getName(ctx);
  const version = def.getVersion(ctx);
  const preset = def.getPreset(ctx);

  return { def, name, version, preset, cannonfile: buf.toString(), filesList };
}

async function loadChainDefinitionToml(
  repo: string,
  ref: string,
  filepath: string,
  trace: string[],
  files: Set<string>
): Promise<[Partial<RawChainDefinition>, string]> {
  let buf: string;
  try {
    buf = await git.readFile(repo, ref, filepath);
  } catch (err: any) {
    throw new Error(`problem while reading artifact (trace): ${trace.join(', ')}: ${err.toString()}`);
  }

  files.add(path.normalize(filepath));

  let rawDef: Partial<RawChainDefinition> & { include?: string[] };
  try {
    rawDef = toml.parse(buf);
  } catch (err: any) {
    throw new Error(`error encountered while parsing toml file ${filepath}: ${err.toString()}`);
  }

  const assembledDef: Partial<RawChainDefinition> = {};

  // we only want to "override" new operations with old operations. So, if we get 2 levels deep, that means we are parsing
  // a operation contents, and we should just take the srcValue
  const customMerge = (_objValue: any, srcValue: any, _key: string, _object: string, _source: any, stack: any) => {
    if (stack.size === 2) {
      // cut off merge for any deeper than this
      return srcValue;
    }
  };

  for (const additionalFilepath of rawDef.include || []) {
    const abspath = filepath.includes('/') ? path.join(path.dirname(filepath), additionalFilepath) : additionalFilepath;

    _.mergeWith(
      assembledDef,
      (await loadChainDefinitionToml(repo, ref, abspath, [filepath].concat(trace), files))[0],
      customMerge
    );
  }

  _.mergeWith(assembledDef, _.omit(rawDef, 'include'), customMerge);

  return [assembledDef, buf];
}

export function parseHintedMulticall(data: Hex): {
  txns: { to: Address; data: Hex; value: bigint }[];
  type: string;
  cannonPackage: string;
  cannonUpgradeFromPackage: string;
  gitRepoUrl: string;
  gitRepoHash: string;
  prevGitRepoHash: string;
  isSinglePackage: boolean;
} | null {
  let decoded = null;

  // see what we can parse out of the data
  try {
    decoded = decodeFunctionData({
      abi: MulticallABI,
      data: data,
    });
  } catch (err) {
    return null;
  }

  let type = '';
  let cannonPackage = '';
  let cannonUpgradeFromPackage = '';
  let gitRepoUrl = '';
  let gitRepoHash = '';
  let prevGitRepoHash = '';

  if (
    (decoded?.functionName === 'aggregate3' || decoded?.functionName === 'aggregate3Value') &&
    ((decoded?.args![0] as any)[0] as any).target === zeroAddress
  ) {
    try {
      [type, cannonPackage, cannonUpgradeFromPackage, gitRepoUrl, gitRepoHash, prevGitRepoHash] = decodeAbiParameters(
        parseAbiParameters('string[]'),
        ((decoded.args![0] as any)[0] as any).callData
      )[0];
    } catch (err) {
      console.log('Could not parse decoded function', { decoded, err });
      return null;
    }
  }

  let txns: { to: Address; data: Hex; value: bigint }[] = [];
  if (decoded?.args?.length) {
    txns = (decoded.args[0] as any[])
      .filter((txn) => !isAddressEqual(txn.target, zeroAddress) && !isAddressEqual(txn.target, onChainStore.deployAddress))
      .map((txn) => ({ to: txn.target, data: txn.callData, value: txn.value }));
  }

  if (!type) return null;

  const isSinglePackage = cannonPackage?.split(',').every(
    (p) =>
      // check all items in the array to see if they are the same
      p === cannonPackage?.split(',')[0]
  );

  return {
    txns,
    type,
    cannonPackage: isSinglePackage ? cannonPackage.split(',')[0] : cannonPackage,
    cannonUpgradeFromPackage,
    gitRepoHash,
    gitRepoUrl,
    prevGitRepoHash,
    isSinglePackage,
  };
}
