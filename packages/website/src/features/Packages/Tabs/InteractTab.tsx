'use client';

import { FC, ReactNode, useEffect } from 'react';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import {
  ChainArtifacts,
  DeploymentInfo,
  PackageReference,
} from '@usecannon/builder';
import { usePackageNameTagVersionUrlParams } from '@/hooks/routing/usePackageVersionUrlParams';
import { usePackageByRef } from '@/hooks/api/usePackage';
import { IpfsSpinner } from '@/components/IpfsSpinner';
import { useRouter } from 'next/navigation';
import { getOutput } from '@/lib/builder';
import { Address } from 'viem';

type AllContracts = {
  moduleName: string;
  contractName: string;
  contractAddress: Address;
  highlight: boolean;
};

const processContracts = (
  allContractsRef: AllContracts[],
  contracts: ChainArtifacts['contracts'],
  moduleName: string
) => {
  if (!contracts) return allContractsRef;

  const processedContracts = Object.entries(contracts).map(
    ([contractName, contractInfo]) => ({
      moduleName: moduleName,
      contractName,
      contractAddress: contractInfo.address,
      highlight: Boolean(contractInfo.highlight),
    })
  );

  allContractsRef.push(...processedContracts);
};

const processImports = (
  allContractsRef: AllContracts[],
  imports: ChainArtifacts['imports'],
  parentModuleName = ''
) => {
  if (imports) {
    Object.entries(imports).forEach(([_moduleName, bundle]) => {
      const moduleName =
        parentModuleName.length === 0
          ? _moduleName
          : `${parentModuleName}.${_moduleName}`;
      processContracts(allContractsRef, bundle.contracts, moduleName);
      processImports(allContractsRef, bundle.imports, moduleName);
    });
  }
};

export const InteractTab: FC<{
  children?: ReactNode;
}> = ({ children }) => {
  const router = useRouter();
  const { name, tag, variant } = usePackageNameTagVersionUrlParams();
  const [chainId, preset] = PackageReference.parseVariant(variant);
  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });

  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    packagesQuery?.data?.deployUrl,
    !!packagesQuery?.data?.deployUrl
  );

  const isLoadingData = packagesQuery.isPending || deploymentData.isPending;

  useEffect(() => {
    if (!deploymentData.data || isLoadingData) {
      return;
    }

    const processDeploymentData = (deploymentInfo: DeploymentInfo) => {
      const allContracts: AllContracts[] = [];
      const cannonOutputs = getOutput(deploymentInfo);
      processContracts(allContracts, cannonOutputs.contracts, name);
      processImports(allContracts, cannonOutputs.imports);

      const highlightedContracts = allContracts.filter(
        (contract) => contract.highlight
      );
      const proxyContracts = allContracts.filter((contract) =>
        contract.contractName.toLowerCase().includes('proxy')
      );

      let highlightedData: AllContracts[] = [];
      if (highlightedContracts.length > 0) {
        highlightedData = highlightedContracts;
      } else if (proxyContracts.length > 0) {
        highlightedData = proxyContracts;
      } else {
        highlightedData = allContracts;
      }

      // Deduplicate contracts with the same address
      const uniqueAddresses = new Set();
      for (const contractData of highlightedData) {
        uniqueAddresses.add(contractData.contractAddress);
      }

      for (const uniqueAddress of uniqueAddresses) {
        const excessContracts = highlightedData.filter(
          (contract) => contract.contractAddress === uniqueAddress
        );
        excessContracts.sort((a, b) => {
          const accumulateDeepLevel = (acc: number, cur: string) =>
            cur === '.' ? acc + 1 : acc;
          const getModuleNameDeepLevel = (moduleName: string) =>
            moduleName.split('').reduce(accumulateDeepLevel, 0);
          const aDeepLevel = getModuleNameDeepLevel(a.moduleName);
          const bDeepLevel = getModuleNameDeepLevel(b.moduleName);
          return aDeepLevel - bDeepLevel;
        });
        excessContracts.shift();
        highlightedData = highlightedData.filter(
          (contract) => !excessContracts.includes(contract)
        );
      }

      // Sort contracts by name
      const sortedHighlightedData = highlightedData.sort((a, b) => {
        const valueA: string = a.contractName;
        const valueB: string = b.contractName;
        return valueA.localeCompare(valueB);
      });

      // Get the first contract from the sorted and deduplicated list
      const targetContract = sortedHighlightedData[0];

      if (targetContract) {
        router.push(
          `/packages/${name}/${tag}/${variant}/interact/${targetContract.moduleName}/${targetContract.contractName}/${targetContract.contractAddress}`
        );
      }
    };

    processDeploymentData(deploymentData.data);
  }, [deploymentData.data, isLoadingData, name, router, tag, variant]);

  return (
    <>
      {isLoadingData ? (
        <div className="py-20">
          <IpfsSpinner ipfsUrl={packagesQuery?.data?.deployUrl} />
        </div>
      ) : (
        <div>{children}</div>
      )}
    </>
  );
};

export default InteractTab;
