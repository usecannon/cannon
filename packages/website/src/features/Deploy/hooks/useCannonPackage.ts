import { ChainBuilderContext, PackageReference } from '@usecannon/builder';
import {
  useCannonPackage as useFetchCannonPackage,
  useMergedCannonDefInfo,
  useCannonFindUpgradeFromUrl,
} from '@/hooks/cannon';
import { useGitDetailsFromCannonfile } from '@/features/Deploy/hooks/useGitDetailsFromCannonfile';

// TODO: is there any way to make a better context? maybe this means we should get rid of name using context?
const ctx: ChainBuilderContext = {
  chainId: 0,
  package: {},
  timestamp: 0 as any, // TODO: fix this
  settings: {},
  contracts: {},
  txns: {},
  imports: {},
  overrideSettings: {},
};

function getCannonPackageError(
  isLoading: boolean,
  cannonDefInfo: ReturnType<typeof useMergedCannonDefInfo>,
  partialDeployInfo: ReturnType<typeof useFetchCannonPackage>,
  prevCannonDeployInfo: ReturnType<typeof useFetchCannonPackage>,
  hasDeployers: boolean
): {
  message: string;
  type: 'definition' | 'partialDeploy' | 'prevDeploy';
} | null {
  if (isLoading) return null;

  // Definition errors
  if (cannonDefInfo?.error) {
    return {
      message: cannonDefInfo.error.toString() || 'There was an error loading the cannonfile.',
      type: 'definition',
    };
  }

  if (!cannonDefInfo?.def) {
    return {
      message: 'No cannonfile definition found.',
      type: 'definition',
    };
  }

  if (
    !(
      cannonDefInfo?.def &&
      (hasDeployers ||
        !cannonDefInfo.def.allActionNames.some((item) => item.startsWith('deploy.') || item.startsWith('contract.')))
    )
  ) {
    return {
      message: 'This cannonfile cannot be deployed using the UI. Please use the CLI to deploy.',
      type: 'definition',
    };
  }

  // Partial deploy errors
  if (partialDeployInfo?.error) {
    return {
      message: `Error fetching partial deploy info: ${partialDeployInfo.error?.message}`,
      type: 'partialDeploy',
    };
  }

  // Previous deploy errors
  if (prevCannonDeployInfo?.error) {
    return {
      message: `Error fetching previous deploy info: ${prevCannonDeployInfo.error?.message}`,
      type: 'prevDeploy',
    };
  }

  return null;
}

function getLoadedState({
  partialDeployInputIpfs,
  partialDeployInfo,
  cannonfileUrlInput,
  cannonDefInfo,
  currentPackageReference,
  onChainPrevPkgQuery,
  prevDeployLocation,
  prevCannonDeployInfo,
}: {
  partialDeployInputIpfs: string;
  partialDeployInfo: ReturnType<typeof useFetchCannonPackage>;
  cannonfileUrlInput: string;
  cannonDefInfo: ReturnType<typeof useMergedCannonDefInfo>;
  currentPackageReference: PackageReference | undefined;
  onChainPrevPkgQuery: ReturnType<typeof useCannonFindUpgradeFromUrl>;
  prevDeployLocation: string;
  prevCannonDeployInfo: ReturnType<typeof useFetchCannonPackage>;
}): boolean {
  const partialDeployLoaded =
    !partialDeployInputIpfs ||
    (!partialDeployInfo.isFetching && !partialDeployInfo.isError && !!partialDeployInfo.ipfsQuery.data?.deployInfo);

  const cannonDefLoaded =
    !cannonfileUrlInput || (!cannonDefInfo.isFetching && !cannonDefInfo.isError && !!cannonDefInfo.def);

  const onChainPrevPkgQueryLoaded =
    !currentPackageReference ||
    (!onChainPrevPkgQuery.isFetching && !onChainPrevPkgQuery.isError && onChainPrevPkgQuery.data !== undefined);

  const prevDeployLoaded =
    !prevDeployLocation ||
    (!prevCannonDeployInfo.isFetching && !prevCannonDeployInfo.isError && !!prevCannonDeployInfo.ipfsQuery.data?.deployInfo);

  return partialDeployLoaded && cannonDefLoaded && onChainPrevPkgQueryLoaded && prevDeployLoaded;
}

export function useCannonPackage({
  cannonfileUrlInput,
  partialDeployIpfs: partialDeployInputIpfs,
  chainId,
  prevPackageReference,
}: {
  cannonfileUrlInput: string;
  partialDeployIpfs: string;
  chainId?: number;
  prevPackageReference: string | null;
}) {
  // If the user enters a partial deploy IPFS hash
  // TODO: check if ipfs:// is needed or if it's duplicated
  const _partialDeployInputIpfs = partialDeployInputIpfs ? `ipfs://${partialDeployInputIpfs}` : '';
  const partialDeployInfo = useFetchCannonPackage(_partialDeployInputIpfs, chainId);

  // Get a cannon definition combining the git and partial deploy info
  // If the user enteres a cannonfile from github
  const gitInfo = useGitDetailsFromCannonfile(cannonfileUrlInput);
  const cannonDefInfo = useMergedCannonDefInfo(gitInfo, partialDeployInfo);

  // Get on-chain previous package query
  const currentPackageReference = cannonDefInfo?.def?.getPackageRef(ctx);
  const onChainPrevPkgQuery = useCannonFindUpgradeFromUrl(
    currentPackageReference,
    chainId,
    cannonDefInfo?.def?.getDeployers(),
    prevPackageReference
  );

  const prevDeployLocation = onChainPrevPkgQuery.data || '';
  const prevCannonDeployInfo = useFetchCannonPackage(prevDeployLocation, chainId);

  // ----------------------------
  // Derived states
  // ----------------------------

  const hasDeployers = Boolean(cannonDefInfo?.def?.getDeployers()?.length);

  // Check if the cannonfile requires a previous package
  const requiresPrevPackage = Boolean(
    cannonDefInfo?.def &&
      !hasDeployers &&
      cannonDefInfo.def.allActionNames.some((item) => item.startsWith('deploy.') || item.startsWith('contract.'))
  );

  const isLoading =
    cannonDefInfo.isFetching ||
    prevCannonDeployInfo.isFetching ||
    onChainPrevPkgQuery.isFetching ||
    partialDeployInfo.isFetching;

  const error =
    _partialDeployInputIpfs || cannonfileUrlInput
      ? getCannonPackageError(isLoading, cannonDefInfo, partialDeployInfo, prevCannonDeployInfo, hasDeployers)
      : null;

  const loaded = getLoadedState({
    partialDeployInputIpfs: _partialDeployInputIpfs,
    partialDeployInfo,
    cannonfileUrlInput,
    cannonDefInfo,
    currentPackageReference,
    onChainPrevPkgQuery,
    prevDeployLocation,
    prevCannonDeployInfo,
  });

  return {
    isLoading,
    error,
    loaded,
    // Base data
    gitInfo,
    partialDeployInfo,
    cannonDefInfo,
    onChainPrevPkgQuery,
    prevDeployLocation,
    prevCannonDeployInfo,
    ctx,
    // Derived state
    hasDeployers,
    requiresPrevPackage,
  };
}
