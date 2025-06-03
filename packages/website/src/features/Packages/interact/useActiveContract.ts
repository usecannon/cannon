import { useRouter } from 'next/router';

/**
 * Custom hook to get the active contract information from the URL
 */
export function useActiveContract() {
  const pathName = useRouter().asPath;
  const withoutMethodSelector = pathName.split('#')[0];
  const selectedContractInfo = withoutMethodSelector.split('interact/')[1];

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
}
