import _ from 'lodash';
import { useChainId } from 'wagmi';
import { useEffect, useState } from 'react';
import { BaseTransaction } from '@safe-global/safe-apps-sdk';
import { useMutation, UseMutationOptions, useQuery } from '@tanstack/react-query';
import { Abi, Address, createPublicClient, createWalletClient, custom, isAddressEqual, PublicClient } from 'viem';

import { useGitRepo } from '@/hooks/git';
import { IPFSBrowserLoader } from '@/helpers/ipfs';
import { useLogs } from '@/providers/logsProvider';
import { useCannonRegistry } from '@/hooks/registry';
import { createFork, findChain } from '@/helpers/rpc';
import { SafeDefinition, useStore } from '@/helpers/store';
import { inMemoryLoader, loadCannonfile, StepExecutionError } from '@/helpers/cannon';

import {
  build as cannonBuild,
  CannonStorage,
  ChainArtifacts,
  ChainBuilderContext,
  ChainBuilderRuntime,
  ChainDefinition,
  createInitialContext,
  DeploymentInfo,
  DeploymentState,
  Events,
  getOutputs,
  InMemoryRegistry,
  publishPackage,
} from '@usecannon/builder';

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

  const loadDefinitionQuery = useQuery({
    queryKey: ['cannon', 'loaddef', repo, ref, filepath],
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

export function useCannonBuild(safe: SafeDefinition | null, def?: ChainDefinition, prevDeploy?: DeploymentInfo) {
  const { addLog } = useLogs();
  const settings = useStore((s) => s.settings);

  const [isBuilding, setIsBuilding] = useState(false);
  const [buildStatus, setBuildStatus] = useState('');

  const [buildResult, setBuildResult] = useState<{
    runtime: ChainBuilderRuntime;
    state: DeploymentState;
    steps: { name: string; gas: bigint; tx: BaseTransaction }[];
  } | null>(null);

  const [buildError, setBuildError] = useState<string | null>(null);

  const [buildSkippedSteps, setBuildSkippedSteps] = useState<StepExecutionError[]>([]);

  const fallbackRegistry = useCannonRegistry();

  const buildFn = async () => {
    if (settings.isIpfsGateway || settings.ipfsApiUrl.includes('https://repo.usecannon.com')) {
      throw new Error('Update your IPFS URL to a Kubo RPC API URL to publish in the settings page.');
    }

    if (!safe || !def || !prevDeploy) {
      throw new Error('Missing required parameters');
    }

    setBuildStatus('Creating fork...');
    const fork = await createFork({
      chainId: safe.chainId,
      impersonate: [safe.address],
    }).catch((err) => {
      err.message = `Could not create local fork for build: ${err.message}`;
      throw err;
    });

    const ipfsLoader = new IPFSBrowserLoader(settings.ipfsApiUrl || 'https://repo.usecannon.com/');

    setBuildStatus('Loading deployment data...');

    addLog(`cannon.ts: upgrade from: ${prevDeploy?.def.name}:${prevDeploy?.def.version}`);

    const transport = custom(fork);

    const provider = createPublicClient({
      chain: findChain(safe.chainId),
      transport,
    });

    const wallet = createWalletClient({
      account: safe.address,
      chain: findChain(safe.chainId),
      transport,
    });

    const getDefaultSigner = async () => ({ address: safe.address, wallet });

    const loaders = { mem: inMemoryLoader, ipfs: ipfsLoader };

    currentRuntime = new ChainBuilderRuntime(
      {
        provider: provider as PublicClient,
        chainId: safe.chainId,
        getSigner: async (addr: Address) => {
          if (!isAddressEqual(addr, safe.address)) {
            throw new Error(`Could not get signer for "${addr}"`);
          }

          return getDefaultSigner();
        },
        getDefaultSigner,
        snapshots: false,
        allowPartialDeploy: true,
      },
      fallbackRegistry,
      loaders
    );

    const simulatedSteps: ChainArtifacts[] = [];
    const skippedSteps: StepExecutionError[] = [];

    currentRuntime.on(
      Events.PostStepExecute,
      (stepType: string, stepLabel: string, stepConfig: any, stepCtx: ChainBuilderContext, stepOutput: ChainArtifacts) => {
        addLog(
          `cannon.ts: on Events.PostStepExecute operation ${stepType}.${stepLabel} output: ${JSON.stringify(stepOutput)}`
        );
        simulatedSteps.push(stepOutput);
        setBuildStatus(`Building ${stepType}.${stepLabel}...`);
      }
    );

    currentRuntime.on(Events.SkipDeploy, (stepName: string, err: Error) => {
      addLog(`cannon.ts: on Events.SkipDeploy error ${err.toString()} happened on the operation ${stepName}`);
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
        if (!executedTx) throw new Error('Invalid operation');
        const tx = await provider.getTransaction({ hash: executedTx.hash });
        const rx = await provider.getTransactionReceipt({ hash: executedTx.hash });
        return {
          name: (executedTx as any).deployedOn,
          gas: rx.gasUsed,
          tx: {
            to: tx.to,
            value: tx.value.toString(),
            data: tx.input,
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
    setIsBuilding(true);
    buildFn()
      .then((res) => {
        setBuildResult(res);
      })
      .catch((err) => {
        addLog(`cannon.ts: full build error ${err.toString()}`);
        setBuildError(err.toString());
      })
      .finally(() => {
        setIsBuilding(false);
        setBuildStatus('');
      });
  }

  return {
    isBuilding,
    buildStatus,
    buildResult,
    buildError,
    buildSkippedSteps,
    doBuild,
  };
}

export function useCannonWriteDeployToIpfs(
  runtime?: ChainBuilderRuntime,
  deployInfo?: DeploymentInfo,
  metaUrl?: string,
  mutationOptions: Partial<UseMutationOptions> = {}
) {
  const settings = useStore((s) => s.settings);

  const writeToIpfsMutation = useMutation({
    ...mutationOptions,
    mutationFn: async () => {
      if (settings.isIpfsGateway) {
        throw new Error('You cannot write on an IPFS gateway, only read operations can be done');
      }

      if (settings.ipfsApiUrl.includes('https://repo.usecannon.com')) {
        throw new Error('You cannot publish on an repo endpoint, only read operations can be done');
      }

      if (!runtime || !deployInfo || !metaUrl) {
        throw new Error('Missing required parameters');
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
  });

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

  const registry = useCannonRegistry();

  const registryQuery = useQuery({
    queryKey: ['cannon', 'registry', packageRef, packageChainId],
    queryFn: async () => {
      if (!packageRef || packageRef.length < 3) {
        return null;
      }

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

  const ipfsQuery = useQuery({
    queryKey: ['cannon', 'pkg', pkgUrl],
    queryFn: async () => {
      addLog(`Loading ${pkgUrl}`);

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
          addLog(`Loaded ${resolvedName}:${resolvedVersion}@${resolvedPreset} from IPFS`);
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
  [x: string]: { address: Address; abi: Abi };
};

function getContractsRecursive(outputs: ChainArtifacts, prefix?: string): ContractInfo {
  const contracts: ContractInfo = {};

  for (const [contractName, contractData] of Object.entries(outputs.contracts || {})) {
    const key = prefix ? `${prefix}.${contractName}` : contractName;
    contracts[key] = { address: contractData.address, abi: contractData.abi };
  }

  for (const [importName, importOutputs] of Object.entries(outputs.imports || {})) {
    Object.assign(contracts, getContractsRecursive(importOutputs, importName));
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
          setContracts(getContractsRecursive(outputs));
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
