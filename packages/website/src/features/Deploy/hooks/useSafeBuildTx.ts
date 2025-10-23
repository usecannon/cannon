'use client';
import { useEffect, useRef } from 'react';
import { ChainDefinition, getIpfsUrl } from '@usecannon/builder';
import { useCannonBuild, useCannonPackage, useLoadCannonDefinition } from '@/hooks/cannon';
import { getChainDefinitionFromWorker } from '@/helpers/chain-definition';
import { hexToString } from 'viem';
import { SafeDefinition } from '@/helpers/store';
import { Hash } from 'viem';
import { parseHintedMulticall } from '@/helpers/cannon';
import { useGetPreviousGitInfoQuery } from '@/hooks/safe';

export function getPrevDeployGitHash({
  queuedWithGitOps,
  prevGitRepoHash,
  gitRepoHash,
  prevDeployHashQuery,
}: {
  prevGitRepoHash?: string;
  gitRepoHash?: string;
  queuedWithGitOps: boolean;
  prevDeployHashQuery?: Hash;
}): string {
  if (!prevGitRepoHash || !gitRepoHash) return '';

  if (queuedWithGitOps) {
    return (prevGitRepoHash || gitRepoHash) ?? '';
  }

  //   return prevDeployHashQuery && prevDeployHashQuery.data?.[0].result
  //     ? prevDeployHashQuery.data[0].result.slice(2)
  //     : gitRepoHash ?? '';

  return prevDeployHashQuery ? prevDeployHashQuery.slice(2) : (gitRepoHash ?? '');
}

type Props = {
  safeDefinition: SafeDefinition;
  isTransactionExecuted: boolean;
  parsedMulticallData: ReturnType<typeof parseHintedMulticall>;
  prevDeployHashQuery: ReturnType<typeof useGetPreviousGitInfoQuery>;
  queuedWithGitOps: boolean;
};

export function useSafeBuildTx({
  safeDefinition,
  isTransactionExecuted,
  parsedMulticallData,
  prevDeployHashQuery,
  queuedWithGitOps,
}: Props) {
  const chainDefinitionRef = useRef<ChainDefinition>();
  const buildInfo = useCannonBuild(safeDefinition);

  // git stuff
  const denom = parsedMulticallData?.gitRepoUrl?.lastIndexOf(':');
  const gitUrl = parsedMulticallData?.gitRepoUrl?.slice(0, denom);
  const gitFile = parsedMulticallData?.gitRepoUrl?.slice((denom ?? 0) + 1);

  const prevDeployPackageUrl = prevDeployHashQuery.data ? hexToString(prevDeployHashQuery.data[1].result || '0x') : '';

  const prevDeployGitHash = getPrevDeployGitHash({
    queuedWithGitOps,
    prevGitRepoHash: parsedMulticallData?.gitRepoHash,
    gitRepoHash: parsedMulticallData?.gitRepoHash,
    prevDeployHashQuery: prevDeployHashQuery.data?.[0].result,
  });

  const cannonPackageUrl = getIpfsUrl(parsedMulticallData?.cannonUpgradeFromPackage || prevDeployPackageUrl);

  const prevCannonDeployInfo = useCannonPackage(cannonPackageUrl || undefined);
  const cannonDefInfo = useLoadCannonDefinition(gitUrl ?? '', parsedMulticallData?.gitRepoHash ?? '', gitFile ?? '');

  // Initialize chain definition
  useEffect(() => {
    const initChainDef = async () => {
      if (!cannonDefInfo.def) return;
      chainDefinitionRef.current = await getChainDefinitionFromWorker(cannonDefInfo.def);
    };

    void initChainDef();
  }, [cannonDefInfo.def]);

  // Trigger build when dependencies are ready
  useEffect(() => {
    if (!safeDefinition || !chainDefinitionRef.current || !prevCannonDeployInfo.ipfsQuery.data?.deployInfo) {
      return;
    }

    buildInfo.doBuild(chainDefinitionRef.current, prevCannonDeployInfo.ipfsQuery.data?.deployInfo);
  }, [
    !isTransactionExecuted && (!prevDeployGitHash || prevCannonDeployInfo.ipfsQuery.isFetched),
    chainDefinitionRef.current,
  ]);

  return {
    buildInfo,
    chainDefinitionRef: chainDefinitionRef.current,
    prevDeployPackageUrl,
  };
}
