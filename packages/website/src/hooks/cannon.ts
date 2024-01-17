import { inMemoryLoader, inMemoryRegistry, loadCannonfile, StepExecutionError } from '@/helpers/cannon';
import { IPFSBrowserLoader } from '@/helpers/ipfs';
import { createFork, findChainUrl } from '@/helpers/rpc';
import { SafeDefinition, useStore } from '@/helpers/store';
import { useGitRepo } from '@/hooks/git';
import { useLogs } from '@/providers/logsProvider';
import { BaseTransaction } from '@safe-global/safe-apps-sdk';
import { useMutation, UseMutationOptions, useQuery } from '@tanstack/react-query';
import {
  build as cannonBuild,
  CannonStorage,
  CannonWrapperGenericProvider,
  ChainArtifacts,
  ChainBuilderContext,
  ChainBuilderRuntime,
  ChainDefinition,
  createInitialContext,
  DeploymentInfo,
  Events,
  FallbackRegistry,
  getOutputs,
  InMemoryRegistry,
  OnChainRegistry,
  publishPackage,
} from '@usecannon/builder';
import { ethers } from 'ethers';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import { mainnet, Address, useChainId } from 'wagmi';

export type BuildState =
  | {
      status: 'idle' | 'loading' | 'error';
      message: string;
    }
  | {
      status: 'success';
      message: string;
      url: string;
      steps: {
        name: string;
        tx: BaseTransaction;
      }[];
      skipped: StepExecutionError[];
    };

let currentRuntime: ChainBuilderRuntime | null = null;

export function useLoadCannonDefinition(repo: string, ref: string, filepath: string) {
  const loadGitRepoQuery = useGitRepo(repo, ref, []);

  const loadDefinitionQuery = useQuery(['cannon', 'loaddef', repo, ref, filepath], {
    queryFn: async () => {
      return loadCannonfile(repo, ref, filepath);
    },
    enabled: loadGitRepoQuery.isSuccess,
  });

  return {
    isFetching: loadGitRepoQuery.isFetching || loadDefinitionQuery.isFetching,
    isError: loadGitRepoQuery.isError || loadDefinitionQuery.isError,
    error: loadGitRepoQuery.error || loadDefinitionQuery.error,
    def: loadDefinitionQuery.data?.def,
    filesList: loadDefinitionQuery.data?.filesList,
  };
}

export function useCannonBuild(safe: SafeDefinition, def: ChainDefinition, prevDeploy: DeploymentInfo, chainId: number) {
  const { addLog } = useLogs();
  const settings = useStore((s) => s.settings);

  const [buildStatus, setBuildStatus] = useState('');

  const [buildResult, setBuildResult] = useState<{
    runtime: ChainBuilderRuntime;
    state: any;
    steps: { name: string; gas: ethers.BigNumber; tx: BaseTransaction }[];
  } | null>(null);

  const [buildError, setBuildError] = useState<string | null>(null);

  const [buildSkippedSteps, setBuildSkippedSteps] = useState<StepExecutionError[]>([]);

  const buildFn = async () => {
    if (settings.isIpfsGateway) {
      throw new Error('You cannot build on an IPFS gateway, only read operations can be done');
    }

    if (settings.ipfsApiUrl.includes('https://repo.usecannon.com')) {
      throw new Error('You cannot publish on an repo endpoint, only read operations can be done');
    }

    setBuildStatus('Creating fork...');
    const fork = await createFork({
      url: findChainUrl(chainId),
      chainId: safe.chainId,
      impersonate: [safe.address],
    }).catch((err) => {
      err.message = `Could not create local fork for build: ${err.message}`;
      throw err;
    });

    const registry = new OnChainRegistry({
      signerOrProvider: findChainUrl(mainnet.id),
      address: settings.registryAddress,
    });

    const ipfsLoader = new IPFSBrowserLoader(settings.ipfsApiUrl || 'https://repo.usecannon.com/');

    setBuildStatus('Loading deployment data...');

    addLog(`cannon.ts: upgrade from: ${prevDeploy?.def.name}:${prevDeploy?.def.version}`);

    const provider = new CannonWrapperGenericProvider({}, new ethers.providers.Web3Provider(fork as any), false);

    // Create a regsitry that loads data first from Memory to be able to utilize
    // the locally built data
    const fallbackRegistry = new FallbackRegistry([inMemoryRegistry, registry]);

    const loaders = { mem: inMemoryLoader, ipfs: ipfsLoader };

    currentRuntime = new ChainBuilderRuntime(
      {
        provider,
        chainId: safe.chainId,
        getSigner: async (addr: string) => provider.getSigner(addr),
        getDefaultSigner: async () => provider.getSigner(safe.address),
        snapshots: false,
        allowPartialDeploy: true,
        publicSourceCode: true,
      },
      fallbackRegistry,
      loaders
    );

    const simulatedSteps: ChainArtifacts[] = [];
    const skippedSteps: StepExecutionError[] = [];

    currentRuntime.on(
      Events.PostStepExecute,
      (stepType: string, stepLabel: string, stepConfig: any, stepCtx: ChainBuilderContext, stepOutput: ChainArtifacts) => {
        addLog(`cannon.ts: on Events.PostStepExecute step ${stepType}.${stepLabel} output: ${JSON.stringify(stepOutput)}`);
        simulatedSteps.push(stepOutput);
        setBuildStatus(`Building ${stepType}.${stepLabel}...`);
      }
    );

    currentRuntime.on(Events.SkipDeploy, (stepName: string, err: Error) => {
      addLog(`cannon.ts: on Events.SkipDeploy error ${err.toString()} happened on the step ${stepName}`);
      skippedSteps.push({ name: stepName, err });
    });

    if (prevDeploy) {
      await currentRuntime.restoreMisc(prevDeploy.miscUrl);
    }

    const ctx = await createInitialContext(def, prevDeploy?.meta || {}, safe.chainId, prevDeploy?.options || {});

    const newState = await cannonBuild(currentRuntime, def, _.cloneDeep(prevDeploy?.state) ?? {}, ctx);

    setBuildSkippedSteps(skippedSteps);

    const simulatedTxs = simulatedSteps
      .map((s) => !!s?.txns && Object.values(s.txns))
      .filter((tx) => !!tx)
      .flat();

    if (simulatedTxs.length === 0) {
      throw new Error('There are no transactions that can be executed on Safe.');
    }

    const steps = await Promise.all(
      simulatedTxs.map(async (executedTx) => {
        const tx = await provider.getTransaction((executedTx as any).hash);
        const receipt = await provider.getTransactionReceipt((executedTx as any).hash);
        return {
          name: (executedTx as any).deployedOn,
          gas: receipt.gasUsed,
          tx: {
            to: tx.to,
            value: tx.value.toString(),
            data: tx.data,
          } as BaseTransaction,
        };
      })
    );

    if (fork) await fork.disconnect();

    return {
      runtime: currentRuntime,
      state: newState,
      steps,
    };
  };

  function doBuild() {
    setBuildResult(null);
    setBuildError(null);
    setBuildSkippedSteps([]);
    buildFn()
      .then((res) => {
        setBuildResult(res);
      })
      .catch((err) => {
        addLog(`cannon.ts: full build error ${err.toString()}`);
        setBuildError(err.toString());
      })
      .finally(() => {
        setBuildStatus('');
      });
  }

  return {
    buildStatus,
    buildResult,
    buildError,
    buildSkippedSteps,
    doBuild,
  };
}

type IPFSPackageWriteResult = {
  packageRef: string;
  mainUrl: string;
  publishTxns: string[];
};

export function useCannonWriteDeployToIpfs(
  runtime: ChainBuilderRuntime,
  deployInfo: DeploymentInfo,
  metaUrl: string,
  mutationOptions: Partial<UseMutationOptions> = {}
) {
  const settings = useStore((s) => s.settings);

  const writeToIpfsMutation = useMutation<IPFSPackageWriteResult>({
    ...mutationOptions,
    mutationFn: async () => {
      if (settings.isIpfsGateway) {
        throw new Error('You cannot write on an IPFS gateway, only read operations can be done');
      }

      if (settings.ipfsApiUrl.includes('https://repo.usecannon.com')) {
        throw new Error('You cannot publish on an repo endpoint, only read operations can be done');
      }

      const def = new ChainDefinition(deployInfo.def);
      const ctx = await createInitialContext(def, deployInfo.meta, runtime.chainId, deployInfo.options);

      const preset = def.getPreset(ctx);
      const packageRef = `${def.getName(ctx)}:${def.getVersion(ctx)}${preset ? '@' + preset : ''}`;

      await runtime.registry.publish(
        [packageRef],
        runtime.chainId,
        (await runtime.loaders.mem.put(deployInfo)) ?? '',
        metaUrl
      );

      const memoryRegistry = new InMemoryRegistry();

      const publishTxns = await publishPackage({
        fromStorage: runtime,
        toStorage: new CannonStorage(
          memoryRegistry,
          { ipfs: new IPFSBrowserLoader(settings.ipfsApiUrl || 'https://repo.usecannon.com/') },
          'ipfs'
        ),
        packageRef,
        chainId: runtime.chainId,
        tags: ['latest'],
        includeProvisioned: true,
      });

      // load the new ipfs url
      const mainUrl = await memoryRegistry.getUrl(packageRef, runtime.chainId);

      return {
        packageRef,
        mainUrl,
        publishTxns,
      };
    },
  } as any); // TODO: why is ts having a freak out fit about this

  return {
    writeToIpfsMutation,
    deployedIpfsHash: writeToIpfsMutation.data?.mainUrl,
  };
}

export function useCannonPackage(packageRef: string, chainId?: number) {
  const connectedChainId = useChainId();
  const { addLog } = useLogs();

  const packageChainId = chainId ?? connectedChainId;

  const settings = useStore((s) => s.settings);

  const registryQuery = useQuery(['cannon', 'registry', packageRef, packageChainId], {
    queryFn: async () => {
      if (!packageRef || packageRef.length < 3) {
        return null;
      }

      const registry = new OnChainRegistry({
        signerOrProvider: findChainUrl(mainnet.id),
        address: settings.registryAddress,
      });

      const url = await registry.getUrl(packageRef, packageChainId);
      const metaUrl = await registry.getMetaUrl(packageRef, packageChainId);

      if (url) {
        return { url, metaUrl };
      } else {
        throw new Error(`package not found: ${packageRef} (${packageChainId})`);
      }
    },
    refetchOnWindowFocus: false,
  });

  const pkgUrl = registryQuery.data?.url;

  const ipfsQuery = useQuery(['cannon', 'pkg', pkgUrl], {
    queryFn: async () => {
      addLog(`LOADING PKG URL: ${pkgUrl}`);

      if (!pkgUrl) return null;

      try {
        const loader = new IPFSBrowserLoader(settings.ipfsApiUrl || 'https://repo.usecannon.com/');

        const deployInfo: DeploymentInfo = await loader.read(pkgUrl as any);

        const def = new ChainDefinition(deployInfo.def);

        const ctx = await createInitialContext(def, deployInfo.meta, 0, deployInfo.options);

        const resolvedName = def.getName(ctx);
        const resolvedVersion = def.getVersion(ctx);
        const resolvedPreset = def.getPreset(ctx);

        if (deployInfo) {
          addLog('LOADED');
          return { deployInfo, ctx, resolvedName, resolvedVersion, resolvedPreset };
        } else {
          throw new Error('failed to download package data');
        }
      } catch (err) {
        addLog(`IPFS Error: ${(err as any)?.message ?? 'unknown error'}`);
        throw err;
      }
    },
    enabled: !!pkgUrl,
  });

  return {
    isFetching: registryQuery.isFetching || ipfsQuery.isFetching,
    isError: registryQuery.isError || ipfsQuery.isError,
    error: registryQuery.error || registryQuery.error,
    registryQuery,
    ipfsQuery,
    pkgUrl,
    metaUrl: registryQuery.data?.metaUrl,
    pkg: ipfsQuery.data?.deployInfo,
    resolvedName: ipfsQuery.data?.resolvedName,
    resolvedVersion: ipfsQuery.data?.resolvedVersion,
    resolvedPreset: ipfsQuery.data?.resolvedPreset,
  };
}

type ContractInfo = {
  [x: string]: { address: Address; abi: any[] };
};

export function getContractsRecursive(
  outputs: ChainArtifacts,
  signerOrProvider: ethers.Signer | ethers.providers.Provider,
  prefix?: string
): ContractInfo {
  let contracts = _.mapValues(outputs.contracts, (ci) => {
    return { address: ci.address as Address, abi: ci.abi };
  });
  if (prefix) {
    contracts = _.mapKeys(contracts, (_, contractName) => `${prefix}.${contractName}`);
  }
  for (const [importName, importOutputs] of Object.entries(outputs.imports || {})) {
    const newContracts = getContractsRecursive(importOutputs, signerOrProvider, importName);
    contracts = { ...contracts, ...newContracts };
  }
  return contracts;
}

export function useCannonPackageContracts(packageRef: string, chainId?: number) {
  const pkg = useCannonPackage(packageRef, chainId);
  const [contracts, setContracts] = useState<ContractInfo | null>(null);
  const settings = useStore((s) => s.settings);

  useEffect(() => {
    const getContracts = async () => {
      if (pkg.pkg) {
        const info = pkg.pkg;

        const loader = new IPFSBrowserLoader(settings.ipfsApiUrl || 'https://repo.usecannon.com/');
        const readRuntime = new ChainBuilderRuntime(
          {
            provider: null as any,
            chainId: 1,
            getSigner: () => {
              return Promise.reject(new Error('unnecessary'));
            },
            snapshots: false,
            allowPartialDeploy: false,
          },
          null as any,
          { ipfs: loader }
        );

        const outputs = await getOutputs(readRuntime, new ChainDefinition(info.def), info.state);

        if (outputs) {
          setContracts(getContractsRecursive(outputs, null as any));
        } else {
          setContracts(null);
        }
      } else {
        setContracts(null);
      }
    };

    void getContracts();
  }, [pkg.pkg, packageRef]);

  return { contracts, ...pkg };
}
