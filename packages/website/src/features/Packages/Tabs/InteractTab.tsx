'use client';

import { FC, ReactNode, useEffect, useState, useMemo } from 'react';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { ChainArtifacts, DeploymentInfo } from '@usecannon/builder';
import { getOutput } from '@/lib/builder';
import { useRouter } from 'next/router';
import { usePackageNameTagVersionUrlParams } from '@/hooks/routing/usePackageVersionUrlParams';
import { usePackageByRef } from '@/hooks/api/usePackage';
import SearchInput from '@/components/SearchInput';
import { Address } from 'viem';
import { IpfsSpinner } from '@/components/IpfsSpinner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MoreHorizontal } from 'lucide-react'; // For the dots icon
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Option = {
  moduleName: string;
  contractName: string;
  contractAddress: string;
};

function useActiveContract() {
  const pathName = useRouter().asPath;

  return useMemo(() => {
    // first remove the hash and selected method
    // then split the path by the interact keyword
    const activeContractPath = pathName.split('#')[0].split('interact/')[1];

    if (activeContractPath) {
      const [moduleName, contractName, contractAddress] =
        activeContractPath.split('/');

      return {
        moduleName,
        contractName,
        contractAddress,
      };
    }
  }, [pathName]);
}

type AllContracts = {
  moduleName: string;
  contractName: string;
  contractAddress: Address;
  highlight: boolean;
};

const processContracts = (
  allContractsRef: AllContracts[], // array passed by reference
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

  // Add to the existing array (modifying the reference)
  allContractsRef.push(...processedContracts);
};

const processImports = (
  allContractsRef: AllContracts[], // array passed by reference
  imports: ChainArtifacts['imports'],
  parentModuleName = ''
) => {
  if (imports) {
    Object.entries(imports).forEach(([_moduleName, bundle]) => {
      // Concatenate module names
      const moduleName =
        parentModuleName.length === 0
          ? _moduleName
          : `${parentModuleName}.${_moduleName}`;
      processContracts(allContractsRef, bundle.contracts, moduleName);
      // recursively process imports
      processImports(allContractsRef, bundle.imports, moduleName);
    });
  }
};

export const InteractTab: FC<{
  children?: ReactNode;
}> = ({ children }) => {
  const router = useRouter();
  const { name, tag, preset, chainId, variant } =
    usePackageNameTagVersionUrlParams();
  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });

  const activeContractOption = useActiveContract();
  const [highlightedOptions, setHighlightedOptions] = useState<Option[]>([]);
  const [otherOptions, setOtherOptions] = useState<Option[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  // const [routing, setRouting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    packagesQuery?.data?.deployUrl,
    !!packagesQuery?.data?.deployUrl
  );

  const isActiveContract = (contract: Option) => {
    if (!activeContractOption) return false;
    return (
      activeContractOption.moduleName === contract.moduleName &&
      activeContractOption.contractName === contract.contractName &&
      activeContractOption.contractAddress === contract.contractAddress
    );
  };

  useEffect(() => {
    if (!deploymentData.data) {
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

      setHighlightedOptions(
        highlightedData.sort((a, b) => {
          const valueA: string = a['contractName'];
          const valueB: string = b['contractName'];
          return valueA.localeCompare(valueB);
        })
      );

      const otherData = allContracts.filter(
        (contract) => !highlightedData.includes(contract)
      );
      setOtherOptions(
        otherData.sort((a, b) => {
          const valueA: string = a['contractName'];
          const valueB: string = b['contractName'];
          return valueA.localeCompare(valueB);
        })
      );

      if (!activeContractOption) {
        const _contract = highlightedData[0] || otherData[0];
        if (_contract) {
          void router.push(
            `/packages/${name}/${tag}/${variant}/interact/${_contract.moduleName}/${_contract.contractName}/${_contract.contractAddress}`
          );
        }
      }
    };

    void processDeploymentData(deploymentData.data);
  }, [activeContractOption, deploymentData.data, name, router, tag, variant]);

  return (
    <>
      <div className="sticky top-0 z-60 bg-gray-900 overflow-x-scroll overflow-y-hidden max-w-[100vw] border-b border-border">
        <Tabs
          defaultValue={
            highlightedOptions[0]?.moduleName +
            '.' +
            highlightedOptions[0]?.contractName
          }
          value={
            activeContractOption
              ? `${activeContractOption.moduleName}.${activeContractOption.contractName}`
              : undefined
          }
          onValueChange={(value) => {
            const [moduleName, contractName] = value.split('.');
            const option = [...highlightedOptions, ...otherOptions].find(
              (opt) =>
                opt.moduleName === moduleName &&
                opt.contractName === contractName
            );
            if (option) {
              void router.push(
                `/packages/${name}/${tag}/${variant}/interact/${option.moduleName}/${option.contractName}/${option.contractAddress}`
              );
            }
          }}
        >
          <TabsList className="rounded-none h-full">
            {highlightedOptions.map((option, i) => (
              <TabsTrigger
                key={i}
                value={`${option.moduleName}.${option.contractName}`}
              >
                {`${option.moduleName}.${option.contractName}`}
              </TabsTrigger>
            ))}

            {otherOptions.length > 0 && (
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <div
                    className={`cursor-pointer px-4 py-2 ${
                      isPopoverOpen
                        ? 'text-teal-400'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="max-h-[45vh] overflow-y-auto overflow-x-hidden w-auto bg-gray-900 border-gray-700 p-0">
                  {otherOptions.length > 5 && (
                    <div className="mt-4 mx-4 min-w-[300px] mb-[16px] md:mb-[32px]">
                      <SearchInput onSearchChange={setSearchTerm} />
                    </div>
                  )}
                  {otherOptions
                    .filter((o) =>
                      searchTerm
                        ? o.contractName.toLowerCase().includes(searchTerm)
                        : true
                    )
                    .map((option, i) => (
                      <div
                        key={i}
                        className={`cursor-pointer p-3 border-b border-gray-700 ${
                          isActiveContract(option)
                            ? 'bg-gray-800'
                            : 'bg-transparent'
                        } hover:bg-gray-800`}
                        onClick={async () => {
                          setIsPopoverOpen(false);
                          await router.push(
                            `/packages/${name}/${tag}/${variant}/interact/${option.moduleName}/${option.contractName}/${option.contractAddress}`
                          );
                        }}
                      >
                        <span className="text-sm text-gray-200">
                          {`${option.moduleName}.${option.contractName}`}
                        </span>
                      </div>
                    ))}
                </PopoverContent>
              </Popover>
            )}
          </TabsList>
        </Tabs>
      </div>
      {deploymentData.isLoading || packagesQuery.isLoading ? (
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
