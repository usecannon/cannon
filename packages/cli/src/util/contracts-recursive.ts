import { ChainArtifacts, ContractData } from '@usecannon/builder';
import { mapKeys } from 'lodash';

export function getContractsRecursive(
  outputs: ChainArtifacts,
  prefix?: string
): {
  [x: string]: ContractData;
} {
  let contracts = outputs.contracts || {};
  if (prefix) {
    contracts = mapKeys(contracts, (_, contractName) => `${prefix}.${contractName}`);
  }
  for (const [importName, importOutputs] of Object.entries(outputs.imports || {})) {
    const newContracts = getContractsRecursive(importOutputs, importName);
    contracts = { ...contracts, ...newContracts };
  }
  return contracts;
}
