'use client';

import QueueDrawer from '@/features/Deploy/QueueDrawer';
import { Abi } from '@/features/Packages/Abi';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { usePackageNameTagVersionUrlParams } from '@/hooks/routing/usePackageVersionUrlParams';
import { getOutput } from '@/lib/builder';
import { useDisclosure } from '@chakra-ui/react';
import {
  ChainArtifacts,
  ContractData,
  DeploymentInfo,
  PackageReference,
} from '@usecannon/builder';
import { FC, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Address } from 'viem';
import { IpfsSpinner } from '@/components/IpfsSpinner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MoreHorizontal, Code, FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SearchInput from '@/components/SearchInput';

import { externalLinks } from '@/constants/externalLinks';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { usePackageByRef } from '@/hooks/api/usePackage';

type Option = {
  moduleName: string;
  contractName: string;
  contractAddress: string;
};

type AllContracts = {
  moduleName: string;
  contractName: string;
  contractAddress: Address;
  highlight: boolean;
};

function useActiveContract() {
  const pathName = useRouter().asPath;

  return useMemo(() => {
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

const Interact: FC = () => {
  const router = useRouter();
  const { variant, tag, name, moduleName, contractName, contractAddress } =
    usePackageNameTagVersionUrlParams();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { getExplorerUrl } = useCannonChains();

  const [chainId, preset] = PackageReference.parseVariant(variant);

  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });

  const [cannonOutputs, setCannonOutputs] = useState<ChainArtifacts>({});
  const [contract, setContract] = useState<ContractData | undefined>();
  const [highlightedOptions, setHighlightedOptions] = useState<Option[]>([]);
  const [otherOptions, setOtherOptions] = useState<Option[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const activeContractOption = useActiveContract();

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

  useEffect(() => {
    if (deploymentData.isPending || !deploymentData.data) {
      return;
    }

    const processOutputs = () => {
      const cannonOutputs: ChainArtifacts = getOutput(deploymentData.data);

      setCannonOutputs(cannonOutputs);

      const findContract = (
        contracts: any,
        parentModuleName: string,
        imports: any
      ): boolean => {
        if (contracts) {
          const contract = Object.entries(contracts).find(
            ([k, v]) =>
              parentModuleName === moduleName &&
              k === contractName &&
              (v as ContractData).address === contractAddress
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
            findContract(
              (v as any).contracts,
              parentModuleName && parentModuleName !== name
                ? `${parentModuleName}.${k}`
                : k,
              (v as any).imports
            )
          );
        }

        return false;
      };

      findContract(cannonOutputs.contracts, name, cannonOutputs.imports);
    };

    void processOutputs();
  }, [
    contractName,
    deploymentData.data,
    deploymentData.isPending,
    name,
    moduleName,
    contractAddress,
  ]);

  const deployUrl = `${
    externalLinks.IPFS_CANNON
  }${packagesQuery.data?.deployUrl.replace('ipfs://', '')}`;

  const explorerUrl = packagesQuery.data?.chainId
    ? getExplorerUrl(packagesQuery.data?.chainId, contractAddress)
    : null;

  const isLoadingData = packagesQuery.isPending || deploymentData.isPending;

  if (!packagesQuery.isLoading && !packagesQuery.data) {
    throw new Error('Failed to fetch package');
  }

  return (
    <>
      <div className="sticky top-[57px] z-50 bg-muted">
        <div className="overflow-x-scroll overflow-y-hidden max-w-[100vw]">
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
            <TabsList className="h-full">
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
                    <div className="cursor-pointer bg-black p-1 border border-border rounded-md mx-2">
                      <MoreHorizontal className="h-4 w-4 text-white" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="max-h-[320px] max-w-[320px] overflow-y-auto overflow-x-hidden w-full bg-background border border-border p-0">
                    {otherOptions.length > 5 && (
                      <div className="p-2">
                        <SearchInput size="sm" onSearchChange={setSearchTerm} />
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
                          className={`cursor-pointer p-2 border-t border-border ${
                            isActiveContract(option)
                              ? 'bg-background'
                              : 'bg-transparent'
                          } hover:bg-accent/50`}
                          onClick={async () => {
                            setIsPopoverOpen(false);
                            await router.push(
                              `/packages/${name}/${tag}/${variant}/interact/${option.moduleName}/${option.contractName}/${option.contractAddress}`
                            );
                          }}
                        >
                          <span className="text-sm">
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

        {/* Header */}
        <div className="flex flex-col md:flex-row bg-background px-2 py-1 border-b border-border items-start md:items-center">
          <div className="p-1">
            <h4 className="inline-block font-medium tracking-[0.1px]">
              {contract?.contractName}
            </h4>
          </div>

          <div className="p-1 md:ml-auto">
            <div className="flex flex-col items-start md:flex-row md:items-end gap-3 md:gap-6 text-gray-300 text-xs font-mono text-muted-foreground">
              <a
                className="no-underline hover:no-underline flex items-center"
                href={`/packages/${name}/${tag}/${variant}/code/${moduleName}?source=${contract?.sourceName}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Code className="h-[14px] w-[14px] mr-1.5" />
                <span className="border-b border-dotted border-gray-300">
                  {contract?.sourceName}
                </span>
              </a>

              <p className="flex items-center">
                {explorerUrl ? (
                  <a
                    className="no-underline hover:no-underline flex items-center"
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="h-[14px] w-[14px] mr-1.5" />
                    <span className="border-b border-dotted border-gray-300">
                      {contractAddress.substring(0, 6)}...
                      {contractAddress.slice(-4)}
                    </span>
                  </a>
                ) : null}{' '}
                {moduleName !== name ? (
                  <>
                    <span className="mx-1">from</span>
                    <a
                      className="no-underline hover:no-underline"
                      href={deployUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="border-b border-dotted border-gray-300">
                        {`[clone.${moduleName}]`}
                      </span>
                    </a>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoadingData ? (
        <div className="py-20">
          <IpfsSpinner ipfsUrl={packagesQuery?.data?.deployUrl} />
        </div>
      ) : (
        <>
          <Abi
            isLoading={isLoadingData}
            abi={contract?.abi}
            contractName={contract?.contractName ?? 'Unknown'}
            contractSource={contract?.sourceName}
            address={contractAddress!}
            cannonOutputs={cannonOutputs}
            chainId={packagesQuery.data!.chainId}
            onDrawerOpen={onOpen}
            packageUrl={packagesQuery.data?.deployUrl}
          />
          <QueueDrawer isOpen={isOpen} onClose={onClose} onOpen={onOpen} />
        </>
      )}
    </>
  );
};

export default Interact;
