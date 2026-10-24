import { ChainBuilderContext } from '@usecannon/builder';
import { useCannonPackage, useMergedCannonDefInfo, useCannonFindUpgradeFromUrl } from '@/hooks/cannon';
import { useGitDetailsFromCannonfile } from '@/features/Deploy/hooks/useGitDetailsFromCannonfile';

interface UseCannonDefinitionsProps {
  cannonfileUrlInput: string;
  partialDeployIpfs: string;
  chainId?: number;
  prevPackageReference: string | null;
  ctx: ChainBuilderContext;
}

export function useCannonDefinitions({
  cannonfileUrlInput,
  partialDeployIpfs,
  chainId,
  prevPackageReference,
  ctx, // TODO: refactor this.
}: UseCannonDefinitionsProps) {
  const gitInfo = useGitDetailsFromCannonfile(cannonfileUrlInput);
  const _partialDeployIpfs = partialDeployIpfs ? `ipfs://${partialDeployIpfs}` : '';

  const partialDeployInfo = useCannonPackage(_partialDeployIpfs, chainId);
  const cannonDefInfo = useMergedCannonDefInfo(gitInfo, partialDeployInfo);

  const currentPackageReference = cannonDefInfo?.def?.getPackageRef(ctx);

  // Get on-chain previous package query
  const onChainPrevPkgQuery = useCannonFindUpgradeFromUrl(
    currentPackageReference,
    chainId,
    cannonDefInfo?.def?.getDeployers(),
    prevPackageReference || undefined,
  );

  const prevDeployLocation = onChainPrevPkgQuery.data || '';
  const prevCannonDeployInfo = useCannonPackage(prevDeployLocation, chainId);

  return {
    isLoading:
      cannonDefInfo.isFetching ||
      prevCannonDeployInfo.isFetching ||
      onChainPrevPkgQuery.isFetching ||
      partialDeployInfo.isFetching,
    isLoaded: Boolean(
      !partialDeployInfo?.isFetching && !partialDeployInfo?.isError && partialDeployInfo?.ipfsQuery.data?.deployInfo,
    ),
    gitInfo,
    partialDeployInfo,
    cannonDefInfo,
    cannonDefInfoError: gitInfo.gitUrl
      ? (cannonDefInfo?.error as any)?.toString()
      : cannonfileUrlInput && 'The format of your URL appears incorrect. Please double check and try again.',
    onChainPrevPkgQuery,
    prevDeployLocation,
    prevCannonDeployInfo,
  };
}
