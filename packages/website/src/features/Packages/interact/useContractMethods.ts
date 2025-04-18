import { useMemo } from 'react';
import { AbiFunction, Abi as AbiType } from 'abitype';
import sortBy from 'lodash/sortBy';

interface UseContractMethodsReturn {
  allContractMethods: AbiFunction[];
  readContractMethods: AbiFunction[];
  writeContractMethods: AbiFunction[];
}

// Helper function to filter functions by state mutability
const filterFunctionsByState = (functions: AbiFunction[], stateMutabilities: string[]): AbiFunction[] =>
  functions.filter((func) => stateMutabilities.includes(func.stateMutability));

export const useContractMethods = (abi: AbiType): UseContractMethodsReturn => {
  return useMemo(() => {
    const abiFunctions = abi?.filter((a) => a.type === 'function');
    const allContractMethods = sortBy(abiFunctions, ['name']);
    const readContractMethods = filterFunctionsByState(allContractMethods, ['view', 'pure']);
    const writeContractMethods = filterFunctionsByState(allContractMethods, ['nonpayable', 'payable']);

    return {
      allContractMethods,
      readContractMethods,
      writeContractMethods,
    };
  }, [abi]);
};
