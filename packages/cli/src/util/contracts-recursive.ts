import { ChainArtifacts, ChainBuilderContext } from '@usecannon/builder';
import { ethers } from 'ethers';
import { mapKeys, mapValues } from 'lodash';

export function getContractsRecursive(
  outputs: ChainArtifacts,
  signerOrProvider: ethers.Signer | ethers.providers.Provider,
  prefix?: string
): {
  [x: string]: ethers.Contract;
} {
  let contracts = mapValues(outputs.contracts, (ci) => {
    return new ethers.Contract(ci.address, ci.abi, signerOrProvider);
  });
  if (prefix) {
    contracts = mapKeys(contracts, (_, contractName) => `${prefix}.${contractName}`);
  }
  for (const [importName, importOutputs] of Object.entries(outputs.imports || {})) {
    const newContracts = getContractsRecursive(importOutputs, signerOrProvider, importName);
    contracts = { ...contracts, ...newContracts };
  }
  return contracts;
}
