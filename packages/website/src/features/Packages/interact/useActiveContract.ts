import { useRouter } from 'next/router';

/**
 * Custom hook to get the active contract information from the URL
 */
export function useActiveContract() {
  const pathName = useRouter().asPath;
  const activeContractPath = pathName.split('#')[0].split('interact/')[1];

  if (activeContractPath) {
    const [moduleName, contractName, contractAddress] = activeContractPath.split('/');

    return {
      moduleName,
      contractName,
      contractAddress,
    };
  }
}
