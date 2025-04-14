import * as viem from 'viem';
import { ChainArtifacts, DeploymentInfo } from '@usecannon/builder';
import { getOutput } from '@/lib/builder';

export type Option = {
  moduleName: string;
  contractName: string;
  contractAddress: string;
};

export type AllContracts = {
  moduleName: string;
  contractName: string;
  contractAddress: viem.Address;
  highlight: boolean;
};

export type ContractOption = {
  moduleName: string;
  contractName: string;
  contractAddress: string;
  highlight: boolean;
  step: string;
  deployTxnHash: string;
  path: string;
  deployType: string;
};

export type ContractOptionMap = {
  [label: string]: ContractOption;
};

export type ContractRow = {
  highlight: boolean;
  name: string;
  address: string;
  deployTxnHash: string;
};

/**
 * Processes a collection of contracts and adds them to the provided array.
 * Each contract is transformed into a standardized format with module name, contract name,
 * address, and highlight status.
 *
 * @param allContractsRef - Array to store the processed contracts
 * @param contracts - Collection of contracts to process
 * @param moduleName - Name of the module these contracts belong to
 * @returns The updated array of contracts
 */
export const processContracts = (
  allContractsRef: AllContracts[],
  contracts: ChainArtifacts['contracts'],
  moduleName: string
) => {
  // If no contracts to process, return the array as is
  if (!contracts) return allContractsRef;

  // Transform each contract into a standardized format
  const processedContracts = Object.entries(contracts).map(([contractName, contractInfo]) => ({
    moduleName,
    contractName,
    contractAddress: contractInfo.address,
    highlight: Boolean(contractInfo.highlight),
  }));

  // Add the processed contracts to the reference array
  allContractsRef.push(...processedContracts);
};

/**
 * Recursively processes imported contracts and their nested imports.
 * This function iterates through the import tree and processes all contracts found in each module.
 *
 * @param allContractsRef - Array to store all processed contracts
 * @param imports - Collection of imported modules and their contracts
 * @param parentModuleName - Name of the parent module (used for nested imports)
 */
export const processImports = (
  allContractsRef: AllContracts[],
  imports: ChainArtifacts['imports'],
  parentModuleName = ''
) => {
  if (imports) {
    // Process each imported module
    Object.entries(imports).forEach(([_moduleName, bundle]) => {
      // Construct the full module name (handles nested imports)
      const moduleName = parentModuleName.length === 0 ? _moduleName : `${parentModuleName}.${_moduleName}`;

      // Process contracts in the current module
      processContracts(allContractsRef, bundle.contracts, moduleName);

      // Recursively process any nested imports
      processImports(allContractsRef, bundle.imports, moduleName);
    });
  }
};

export const processDeploymentData = (deploymentInfo: DeploymentInfo, name: string): [AllContracts[], AllContracts[]] => {
  const allContracts: AllContracts[] = [];
  const cannonOutputs = getOutput(deploymentInfo);
  processContracts(allContracts, cannonOutputs.contracts, name);
  processImports(allContracts, cannonOutputs.imports);

  const highlightedContracts = allContracts.filter((contract) => contract.highlight);
  const proxyContracts = allContracts.filter((contract) => contract.contractName.toLowerCase().includes('proxy'));

  let highlightedData: any[] = [];
  if (highlightedContracts.length > 0) {
    highlightedData = highlightedContracts;
  } else if (proxyContracts.length > 0) {
    highlightedData = proxyContracts;
  } else {
    highlightedData = allContracts;
  }

  const uniqueAddresses = new Set();
  for (const contractData of highlightedData) {
    uniqueAddresses.add(contractData.contractAddress);
  }

  for (const uniqueAddress of uniqueAddresses) {
    const excessContracts = highlightedData.filter((contract) => contract.contractAddress === uniqueAddress);
    excessContracts.sort((a, b) => {
      const accumulateDeepLevel = (acc: number, cur: string) => (cur === '.' ? acc + 1 : acc);
      const getModuleNameDeepLevel = (moduleName: string) => moduleName.split('').reduce(accumulateDeepLevel, 0);
      const aDeepLevel = getModuleNameDeepLevel(a.moduleName);
      const bDeepLevel = getModuleNameDeepLevel(b.moduleName);
      return aDeepLevel - bDeepLevel;
    });
    excessContracts.shift();
    highlightedData = highlightedData.filter((contract) => !excessContracts.includes(contract));
  }

  const otherData = allContracts.filter((contract) => !highlightedData.includes(contract));
  return [highlightedData, otherData];
};

export const markHighlight = (data: AllContracts[], highlight: boolean): AllContracts[] => {
  return data.map((item) => ({ ...item, highlight }));
};

export const buildInteractPath = (
  name: string,
  tag: string,
  variant: string,
  moduleName: string,
  contractName: string,
  contractAddress: string
): string => {
  return `/packages/${name}/${tag}/${variant}/interact/${moduleName}/${contractName}/${contractAddress}`;
};

export const sortByModulePriority = (data: AllContracts[], name: string): AllContracts[] => {
  return data.sort((a, b) => {
    if (a.moduleName === name && b.moduleName !== name) return -1;
    if (a.moduleName !== name && b.moduleName === name) return 1;

    const valueA: string = a['contractName'];
    const valueB: string = b['contractName'];
    return valueA.localeCompare(valueB);
  });
};
