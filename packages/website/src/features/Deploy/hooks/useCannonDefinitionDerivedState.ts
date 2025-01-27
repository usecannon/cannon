import { useMemo } from 'react';
import { useCannonPackage, useMergedCannonDefInfo } from '@/hooks/cannon';

interface UseCannonfileDerivedStateProps {
  cannonDefInfo?: ReturnType<typeof useMergedCannonDefInfo>;
  cannonfileUrlInput: string;
  partialDeployInfo?: ReturnType<typeof useCannonPackage>;
  isLoading: boolean;
}

export function useCannonDefinitionDerivedState({
  cannonDefInfo,
  cannonfileUrlInput,
  partialDeployInfo,
  isLoading,
}: UseCannonfileDerivedStateProps) {
  const hasDeployers = Boolean(cannonDefInfo?.def?.getDeployers()?.length);

  // Check if the cannonfile requires a previous package
  const requiresPrevPackage = useMemo(
    () =>
      Boolean(
        cannonDefInfo?.def &&
          !hasDeployers &&
          cannonDefInfo.def.allActionNames.some((item) => item.startsWith('deploy.') || item.startsWith('contract.'))
      ),
    [cannonDefInfo?.def, hasDeployers]
  );

  // Check if the cannonfile can be deployed using the website
  const canBeDeployedUsingWebsite = useMemo(() => {
    if (!cannonDefInfo?.def) return false;

    // If there are no deployers defined and there are deploy/contract actions,
    // we can't deploy from website
    if (
      !hasDeployers &&
      cannonDefInfo.def.allActionNames.some((item) => item.startsWith('deploy.') || item.startsWith('contract.'))
    ) {
      return false;
    }

    return true;
  }, [cannonDefInfo?.def, hasDeployers]);

  // Check if the cannon info definition is loaded
  const isDefinitionLoaded = useMemo(
    () => Boolean(cannonfileUrlInput.length > 0 && !cannonDefInfo?.error && cannonDefInfo?.def),
    [cannonfileUrlInput, cannonDefInfo]
  );

  // Error message logic
  const error = useMemo(() => {
    if (isLoading) return null;

    if (partialDeployInfo?.isError) {
      return `Error fetching partial deploy info: ${partialDeployInfo.error?.message}`;
    }

    if (!canBeDeployedUsingWebsite) {
      return 'This cannonfile cannot be deployed using the UI. Please use the CLI to deploy.';
    }

    if (!cannonDefInfo?.def) {
      return 'No cannonfile definition found. Please input the link to the cannonfile to build.';
    }

    return null;
  }, [
    isLoading,
    partialDeployInfo?.isError,
    partialDeployInfo?.error?.message,
    canBeDeployedUsingWebsite,
    cannonDefInfo?.def,
  ]);

  return {
    requiresPrevPackage,
    canBeDeployedUsingWebsite,
    cannonInfoDefinitionLoaded: isDefinitionLoaded,
    hasDeployers,
    error,
  };
}
