import { externalLinks } from '@/constants/externalLinks';
import { inMemoryLoader, loadCannonfile, StepExecutionError } from '@/helpers/cannon';
import { IPFSBrowserLoader } from '@/helpers/ipfs';
import { useCreateFork } from '@/helpers/rpc';
import { SafeDefinition, useStore } from '@/helpers/store';
import { useGitRepo } from '@/hooks/git';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { useCannonRegistry } from '@/providers/CannonRegistryProvider';
import { useLogs } from '@/providers/logsProvider';
import { BaseTransaction } from '@safe-global/safe-apps-sdk';
import { useMutation, UseMutationOptions, useQuery } from '@tanstack/react-query';
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
  loadPrecompiles,
  PackageReference,
  publishPackage,
} from '@usecannon/builder';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import { Abi, Address, createPublicClient, createTestClient, createWalletClient, custom, Hex, isAddressEqual } from 'viem';
import { useChainId } from 'wagmi';
// Needed to prepare mock run step with registerAction
import '@/lib/builder';

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
    isLoading: loadGitRepoQuery.isLoading || loadDefinitionQuery.isLoading,
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

  const { getChainById } = useCannonChains();
  const createFork = useCreateFork();

  const buildFn = async () => {
    // Wait until finished loading
    if (!safe || !def || !prevDeploy) {
      throw new Error('Missing required parameters');
    }

    const chain = getChainById(safe.chainId);

    setBuildStatus('Creating fork...');
    // eslint-disable-next-line no-console
    console.log(`Creating fork with RPC: ${chain?.rpcUrls.default.http[0]}`);
    const fork = await createFork({
      chainId: safe.chainId,
      impersonate: [safe.address],
      url: chain?.rpcUrls.default.http[0],
    }).catch((err) => {
      err.message = `Could not create local fork for build: ${err.message}`;
      throw err;
    });

    const ipfsLoader = new IPFSBrowserLoader(settings.ipfsApiUrl || externalLinks.IPFS_CANNON);

    setBuildStatus('Loading deployment data...');

    addLog('info', `cannon.ts: upgrade from: ${prevDeploy?.def.name}:${prevDeploy?.def.version}`);

    const transport = custom(fork);

    const provider = createPublicClient({
      chain,
      transport,
    });

    const testProvider = createTestClient({
      chain,
      transport,
      mode: 'ganache',
    });

    // todo: as usual viem provider types refuse to work
    await loadPrecompiles(testProvider as any);

    const wallet = createWalletClient({
      account: safe.address,
      chain: getChainById(safe.chainId),
      transport,
    });

    const getDefaultSigner = async () => ({ address: safe.address, wallet });

    const loaders = { mem: inMemoryLoader, ipfs: ipfsLoader };

    const getSigner = async (addr: Address) => {
      if (!isAddressEqual(addr, safe.address)) {
        throw new Error(`Could not get signer for "${addr}"`);
      }

      return getDefaultSigner();
    };

    currentRuntime = new ChainBuilderRuntime(
      {
        provider: provider as any, // TODO: fix type
        chainId: safe.chainId,
        getSigner: getSigner as any, // TODO: fix type
        getDefaultSigner: getDefaultSigner as any, // TODO: fix type
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
        const stepName = `${stepType}.${stepLabel}`;

        addLog('info', `cannon.ts: on Events.PostStepExecute operation ${stepName} output: ${JSON.stringify(stepOutput)}`);

        simulatedSteps.push(_.cloneDeep(stepOutput));

        for (const txn in stepOutput.txns || {}) {
          // clean out txn hash
          stepOutput.txns![txn].hash = '';
        }

        setBuildStatus(`Building ${stepName}...`);

        // a step that deploys a contract is a step that has no txns deployed but contract(s) deployed
        if (_.keys(stepOutput.txns).length === 0 && _.keys(stepOutput.contracts).length > 0) {
          throw new Error(`Cannot deploy contract on a Safe transaction for step ${stepName}`);
        }
      }
    );

    currentRuntime.on(Events.SkipDeploy, (stepName: string, err: Error) => {
      addLog('error', `cannon.ts: on Events.SkipDeploy error ${err.toString()} happened on the operation ${stepName}`);
      skippedSteps.push({ name: stepName, err });
    });

    currentRuntime.on(Events.Notice, (stepName: string, msg: string) => {
      addLog('warn', `${stepName}: ${msg}`);
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
        const tx = await provider.getTransaction({ hash: executedTx.hash as Hex });
        const rx = await provider.getTransactionReceipt({ hash: executedTx.hash as Hex });
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
        // eslint-disable-next-line no-console
        console.error(err);
        addLog('error', `cannon.ts: full build error ${err.toString()}`);
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
  deployInfo?: DeploymentInfo | undefined,
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

      if (!runtime || !deployInfo) {
        throw new Error('Missing required parameters');
      }

      const def = new ChainDefinition(deployInfo.def);
      const ctx = await createInitialContext(def, deployInfo.meta, runtime.chainId, deployInfo.options);

      const preset = def.getPreset(ctx);
      const packageRef = PackageReference.from(def.getName(ctx), def.getVersion(ctx), preset).fullPackageRef;

      await runtime.registry.publish(
        [packageRef],
        runtime.chainId,
        (await runtime.loaders.mem.put(deployInfo)) ?? '',
        metaUrl as string
      );

      const memoryRegistry = new InMemoryRegistry();

      const publishTxns = await publishPackage({
        fromStorage: runtime,
        toStorage: new CannonStorage(
          memoryRegistry,
          { ipfs: new IPFSBrowserLoader(settings.ipfsApiUrl || externalLinks.IPFS_CANNON) },
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

export function useCannonPackage(packageRef?: string, chainId?: number) {
  const connectedChainId = useChainId();
  const registry = useCannonRegistry();
  const settings = useStore((s) => s.settings);
  const { addLog } = useLogs();

  const packageChainId = chainId ?? connectedChainId;

  const registryQuery = useQuery({
    queryKey: ['cannon', 'registry-url', packageRef, packageChainId],
    queryFn: async () => {
      if (typeof packageRef !== 'string' || packageRef.length < 3) {
        return null;
      }

      if (packageRef.startsWith('ipfs://')) return { url: packageRef };
      if (packageRef.startsWith('@ipfs:')) return { url: packageRef.replace('@ipfs:', 'ipfs://') };

      const url = await registry.getUrl(packageRef, packageChainId);

      if (url) {
        return { url };
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
      addLog('info', `Loading ${pkgUrl}`);

      if (!pkgUrl) return null;

      try {
        const loader = new IPFSBrowserLoader(settings.ipfsApiUrl || externalLinks.IPFS_CANNON);

        const deployInfo: DeploymentInfo = await loader.read(pkgUrl as any);

        const def = new ChainDefinition(deployInfo.def);

        const ctx = await createInitialContext(def, deployInfo.meta, 0, deployInfo.options);

        const resolvedName = def.getName(ctx);
        const resolvedVersion = def.getVersion(ctx);
        const resolvedPreset = def.getPreset(ctx);
        const { fullPackageRef } = PackageReference.from(resolvedName, resolvedVersion, resolvedPreset);

        if (deployInfo) {
          addLog('info', `Loaded ${resolvedName}:${resolvedVersion}@${resolvedPreset} from IPFS`);
          return { deployInfo, ctx, resolvedName, resolvedVersion, resolvedPreset, fullPackageRef };
        } else {
          throw new Error('failed to download package data');
        }
      } catch (err) {
        addLog('error', `IPFS Error: ${(err as any)?.message ?? 'unknown error'}`);
        throw err;
      }
    },
    enabled: !!pkgUrl,
  });

  const fullPackageRef = ipfsQuery.data?.fullPackageRef;

  const registryQueryMeta = useQuery({
    queryKey: ['cannon', 'registry-meta', fullPackageRef, packageChainId],
    queryFn: async () => {
      if (typeof fullPackageRef !== 'string' || fullPackageRef.length < 3) {
        return null;
      }

      const metaUrl = await registry.getMetaUrl(fullPackageRef, packageChainId);

      if (metaUrl) {
        return { metaUrl };
      } else {
        return null;
      }
    },
    refetchOnWindowFocus: false,
  });

  return {
    isLoading: registryQuery.isLoading || ipfsQuery.isLoading || registryQueryMeta.isLoading,
    isFetching: registryQuery.isFetching || ipfsQuery.isFetching || registryQueryMeta.isFetching,
    isError: registryQuery.isError || ipfsQuery.isError || registryQueryMeta.isError,
    error: registryQuery.error || registryQuery.error || registryQueryMeta.error,
    registryQuery,
    ipfsQuery,
    pkgUrl,
    metaUrl: registryQueryMeta.data?.metaUrl,
    pkg: ipfsQuery.data?.deployInfo,
    resolvedName: ipfsQuery.data?.resolvedName,
    resolvedVersion: ipfsQuery.data?.resolvedVersion,
    resolvedPreset: ipfsQuery.data?.resolvedPreset,
    fullPackageRef,
  };
}

export type ContractInfo = {
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

export function useCannonPackageContracts(packageRef?: string, chainId?: number) {
  const pkg = useCannonPackage(packageRef, chainId);
  const [contracts, setContracts] = useState<ContractInfo | null>(null);
  const settings = useStore((s) => s.settings);

  useEffect(() => {
    const getContracts = async () => {
      if (pkg.pkg) {
        const info = pkg.pkg;

        const loader = new IPFSBrowserLoader(settings.ipfsApiUrl || externalLinks.IPFS_CANNON);
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
export type UseCannonPackageContractsReturnType = ReturnType<typeof useCannonPackageContracts>;
