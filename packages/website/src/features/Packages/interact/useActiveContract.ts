import { useRouter } from 'next/router';
import { useMemo } from 'react';

/**
 * Custom hook to get the active contract information from the URL
 * Returns memoized contract information to prevent unnecessary recalculations
 */
export function useActiveContract() {
  const pathName = useRouter().asPath;

  return useMemo(() => {
    const withoutMethodSelector = pathName.split('#')[0];
    const selectedContractInfo = withoutMethodSelector.split('/interact/')[1];

    if (selectedContractInfo) {
      const [moduleName, contractName, contractAddress] = selectedContractInfo.split('/');

      if (!moduleName || !contractName || !contractAddress) {
        return undefined;
      }

      return {
        moduleName,
        contractName,
        contractAddress,
      };
    }
  }, [pathName]);
}
