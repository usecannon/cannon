import { useEffect, useState } from 'react';
import { ChainArtifacts, ContractData, DeploymentInfo } from '@usecannon/builder';
import { getOutput } from '@/lib/builder';
import { usePackageNameTagVersionUrlParams } from '@/hooks/routing/usePackageVersionUrlParams';

/**
 * Custom hook to load and process contracts from deployment data
 */
export function useDeploymentContracts(deploymentData: DeploymentInfo | undefined) {
  const [cannonOutputs, setCannonOutputs] = useState<ChainArtifacts>({});
  const [contract, setContract] = useState<ContractData | undefined>();
  const { name, moduleName, contractName, contractAddress } = usePackageNameTagVersionUrlParams();

  useEffect(() => {
    if (!deploymentData) {
      return;
    }

    const cannonOutputs: ChainArtifacts = getOutput(deploymentData);
    setCannonOutputs(cannonOutputs);

    const loadAllContractFromDeployment = (contracts: any, parentModuleName: string, imports: any): boolean => {
      if (contracts) {
        const contract = Object.entries(contracts).find(
          ([k, v]) =>
            parentModuleName === moduleName && k === contractName && (v as ContractData).address === contractAddress
        );

        if (contract) {
          const [k, v] = contract;
          setContract({
            ...(v as ContractData),
            contractName: k,
          });
          return true;
        }
      }

      if (imports) {
        return Object.entries(imports).some(([k, v]) =>
          loadAllContractFromDeployment(
            (v as any).contracts,
            parentModuleName && parentModuleName !== name ? `${parentModuleName}.${k}` : k,
            (v as any).imports
          )
        );
      }

      return false;
    };

    loadAllContractFromDeployment(cannonOutputs.contracts, name, cannonOutputs.imports);
  }, [deploymentData, name, moduleName, contractName, contractAddress]);

  return { cannonOutputs, contract };
}
