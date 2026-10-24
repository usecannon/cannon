import { isEmpty } from 'lodash';
import { BundledChainBuilderOutputs, ContractData, DeploymentState, ContractMap } from '@usecannon/builder/src/types';

const stepDefinitions: string[] = ['deploy', 'contract', 'provision', 'clone', 'import', 'pull', 'router', 'invoke', 'run'];

// Helper function to reduce ContractMap array into merged contracts
function reduceContractMaps({
  contracts,
  contractMap,
  deployedOn,
}: {
  contracts: Record<string, ContractData>;
  contractMap: ContractMap;
  deployedOn?: string;
}): Record<string, ContractData> {
  // Skip if contractMap is empty
  if (isEmpty(contractMap)) {
    return contracts;
  }

  // Iterate through contracts in the map
  Object.entries(contractMap).forEach(([, contract]) => {
    if (!contract || isEmpty(contract)) {
      return;
    }

    // If deployedOn is provided, override the contract's deployedOn
    if (deployedOn) {
      contract.deployedOn = deployedOn;
    }

    const hasStepDefinition = stepDefinitions.some((step) => contract.deployedOn?.includes(step));

    if (contract.address && contract.abi && hasStepDefinition) {
      contracts[contract.address] = contract;
    }
  });

  return contracts;
}

// Helper function to process imports recursively
function processImports(
  imports: BundledChainBuilderOutputs,
  mergedContracts: Record<string, ContractData>,
  parentKey?: string,
) {
  // Iterate through each module in imports
  Object.entries(imports).forEach(([key, bundledOutput]) => {
    // Process contracts from this import if they exist
    if (bundledOutput.contracts) {
      reduceContractMaps({
        contracts: mergedContracts,
        contractMap: bundledOutput.contracts,
        deployedOn: parentKey,
      });
    }

    // Recursively process nested imports
    if (bundledOutput.imports) {
      processImports(bundledOutput.imports, mergedContracts, key);
    }
  });
}

function mergeArtifactsContracts(
  state: DeploymentState,
  mergedContracts: Record<string, ContractData> = {},
): Record<string, ContractData> {
  // Iterate through all steps in the deployment state
  Object.entries(state).forEach(([key, step]) => {
    if (!step.artifacts) return;

    // Process direct contracts if they exist
    if (!isEmpty(step.artifacts.contracts)) {
      reduceContractMaps({
        contracts: mergedContracts,
        contractMap: step.artifacts.contracts,
        deployedOn: key,
      });
    }

    // Process imports if they exist
    if (step.artifacts.imports) {
      processImports(step.artifacts.imports, mergedContracts, key);
    }
  });

  return mergedContracts;
}

export function extractContractsImports(obj: DeploymentState): Record<string, ContractData> {
  return mergeArtifactsContracts(obj);
}
