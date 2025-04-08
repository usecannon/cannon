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

export type ContractTableOption = {
  moduleName: string;
  contractName: string;
  contractAddress: string;
  highlight: boolean;
  step: string;
  deployTxnHash: string;
  path: string;
};

export type ContractRow = {
  highlight: boolean;
  name: string;
  address: string;
  deployTxnHash: string;
};

const processContracts = (allContractsRef: AllContracts[], contracts: ChainArtifacts['contracts'], moduleName: string) => {
  if (!contracts) return allContractsRef;

  const processedContracts = Object.entries(contracts).map(([contractName, contractInfo]) => ({
    moduleName: moduleName,
    contractName,
    contractAddress: contractInfo.address,
    highlight: Boolean(contractInfo.highlight),
  }));

  allContractsRef.push(...processedContracts);
};

const processImports = (allContractsRef: AllContracts[], imports: ChainArtifacts['imports'], parentModuleName = '') => {
  if (imports) {
    Object.entries(imports).forEach(([_moduleName, bundle]) => {
      const moduleName = parentModuleName.length === 0 ? _moduleName : `${parentModuleName}.${_moduleName}`;
      processContracts(allContractsRef, bundle.contracts, moduleName);
      processImports(allContractsRef, bundle.imports, moduleName);
    });
  }
};

export const processDeploymentData = (deploymentInfo: DeploymentInfo, name: string): [any[], any[]] => {
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
