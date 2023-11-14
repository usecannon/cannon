import MulticallABI from '@/abi/Multicall.json';
import * as git from '@/helpers/git';
import toml from '@iarna/toml';
import path from '@isomorphic-git/lightning-fs/src/path';
import {
  build as cannonBuild,
  BuildOptions,
  CANNON_CHAIN_ID,
  CannonLoader,
  CannonRegistry,
  CannonWrapperGenericProvider,
  ChainArtifacts,
  ChainBuilderContext,
  ChainBuilderRuntime,
  ChainDefinition,
  createInitialContext,
  DeploymentInfo,
  Events,
  InMemoryRegistry,
  RawChainDefinition,
  TransactionMap,
} from '@usecannon/builder';
import CannonRegistryAbi from '@usecannon/builder/dist/abis/CannonRegistry';
import { ethers } from 'ethers';
import _ from 'lodash';
import { Address, decodeAbiParameters, decodeFunctionData, Hex, parseAbiParameters, zeroAddress } from 'viem';

export type CannonTransaction = TransactionMap[keyof TransactionMap];

export interface StepExecutionError {
  name: string;
  err: Error;
}

export class InMemoryLoader implements CannonLoader {
  private datas = new Map<string, string>();
  readonly space: number;
  private idx = 0;

  constructor(space: number) {
    this.space = space;
  }

  getLabel(): string {
    return 'in memory';
  }

  async read(url: string): Promise<any | null> {
    return JSON.parse(this.datas.get(url) ?? '');
  }
  async put(misc: any): Promise<string | null> {
    const k = `mem://${this.space}/${this.idx++}`;
    this.datas.set(k, JSON.stringify(misc));

    return k;
  }
}

export const inMemoryRegistry = new InMemoryRegistry();
export const inMemoryLoader = new InMemoryLoader(Math.floor(Math.random() * 100000));

export async function build({
  chainId,
  provider,
  def,
  options,
  defaultSignerAddress,
  incompleteDeploy,
  registry,
  loaders,
  onStepExecute,
}: {
  chainId: number;
  provider: CannonWrapperGenericProvider;
  def: ChainDefinition;
  options: BuildOptions;
  defaultSignerAddress: string;
  incompleteDeploy: DeploymentInfo;
  registry: CannonRegistry;
  loaders: { [k: string]: CannonLoader };
  onStepExecute: (stepType: string, stepName: string, outputs: ChainArtifacts) => void;
}) {
  const runtime = new ChainBuilderRuntime(
    {
      provider,
      chainId,
      getSigner: async (addr: string) => provider.getSigner(addr),
      getDefaultSigner: async () => provider.getSigner(defaultSignerAddress),
      snapshots: false,
      allowPartialDeploy: true,
      publicSourceCode: true,
    },
    registry,
    loaders
  );

  const simulatedSteps: ChainArtifacts[] = [];
  const skippedSteps: StepExecutionError[] = [];

  runtime.on(
    Events.PostStepExecute,
    (stepType: string, stepLabel: string, stepConfig: any, stepCtx: ChainBuilderContext, stepOutput: ChainArtifacts) => {
      simulatedSteps.push(stepOutput);
      onStepExecute(stepType, stepLabel, stepOutput);
    }
  );

  runtime.on(Events.SkipDeploy, (stepName: string, err: Error) => {
    console.log(stepName, err);
    skippedSteps.push({ name: stepName, err });
  });

  if (incompleteDeploy) {
    await runtime.restoreMisc(incompleteDeploy.miscUrl);
  }

  const ctx = await createInitialContext(def, incompleteDeploy?.meta || {}, chainId, incompleteDeploy?.options || options);

  const newState = await cannonBuild(runtime, def, incompleteDeploy?.state ?? {}, ctx);

  const simulatedTxs = simulatedSteps
    .map((s) => !!s?.txns && Object.values(s.txns))
    .filter((tx) => !!tx)
    .flat();

  const name = def.getName(ctx);
  const version = def.getVersion(ctx);

  return { name, version, runtime, def, newState, simulatedTxs, skippedSteps };
}

interface PublishParams {
  packageName: string;
  variant: string;
  packageTags: string[];
  packageVersionUrl: string;
  packageMetaUrl: string;
}

export function createPublishData({ packageName, variant, packageTags, packageVersionUrl, packageMetaUrl }: PublishParams) {
  const ICannonRegistry = new ethers.utils.Interface(CannonRegistryAbi);
  return ICannonRegistry.encodeFunctionData('publish', [
    ethers.utils.formatBytes32String(packageName),
    ethers.utils.formatBytes32String(variant),
    packageTags.map((p) => ethers.utils.formatBytes32String(p)),
    packageVersionUrl,
    packageMetaUrl,
  ]);
}

export function validatePreset(preset: string) {
  return /^[a-z]+$/.test(preset);
}

export async function loadCannonfile(repo: string, ref: string, filepath: string) {
  const filesList = new Set<string>();
  const [rawDef, buf] = await loadChainDefinitionToml(repo, ref, filepath, [], filesList);
  const def = new ChainDefinition(rawDef as RawChainDefinition);
  //const pkg = loadPackageJson(path.join(path.dirname(filepath), 'package.json'));

  const ctx: ChainBuilderContext = {
    package: {},
    chainId: CANNON_CHAIN_ID,
    settings: {},
    timestamp: '0',

    contracts: {},
    txns: {},
    imports: {},
    extras: {},
  };

  const name = def.getName(ctx);
  const version = def.getVersion(ctx);

  return { def, name, version, cannonfile: buf.toString(), filesList };
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

  // we only want to "override" new steps with old steps. So, if we get 2 levels deep, that means we are parsing
  // a step contents, and we should just take the srcValue
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

export function parseHintedMulticall(data: Hex) {
  let decoded: ReturnType<typeof decodeFunctionData> | null = null;

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
    (decoded.functionName === 'aggregate3' || decoded.functionName === 'aggregate3Value') &&
    ((decoded.args![0] as any)[0] as any).target === zeroAddress
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
  if (decoded.args?.length) {
    txns = (decoded.args[0] as any[])
      .slice(type === 'deploy' ? 3 : 1)
      .map((txn) => ({ to: txn.target, data: txn.callData, value: txn.value }));
  }

  if (!type) return null;

  return {
    txns,
    type,
    cannonPackage,
    cannonUpgradeFromPackage,
    gitRepoHash,
    gitRepoUrl,
    prevGitRepoHash,
  };
}
