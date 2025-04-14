'use client';

import QueueDrawer from '@/features/Deploy/QueueDrawer';
import { Abi } from '@/features/Packages/Abi';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { usePackageNameTagVersionUrlParams } from '@/hooks/routing/usePackageVersionUrlParams';
import { getOutput } from '@/lib/builder';
import {
  ChainArtifacts,
  ContractData,
  DeploymentInfo,
  PackageReference,
} from '@usecannon/builder';
import { FC, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import * as viem from 'viem';
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
import { ClipboardButton } from '@/components/ClipboardButton';
import {
  buildInteractPath,
  Option,
  processDeploymentData,
  sortByModulePriority,
} from '@/lib/interact';

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

const Interact: FC = () => {
  const router = useRouter();
  const { getExplorerUrl } = useCannonChains();
  const { variant, tag, name, moduleName, contractName, contractAddress } =
    usePackageNameTagVersionUrlParams();
  const activeContractOption = useActiveContract();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cannonOutputs, setCannonOutputs] = useState<ChainArtifacts>({});
  const [contract, setContract] = useState<ContractData | undefined>();
  const [highlightedOptions, setHighlightedOptions] = useState<Option[]>([]);
  const [otherOptions, setOtherOptions] = useState<Option[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [chainId, preset] = PackageReference.parseVariant(variant);
  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });
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

    const [highlightedData, otherData] = processDeploymentData(
      deploymentData.data,
      name
    );

    setHighlightedOptions(sortByModulePriority(highlightedData, name));

    setOtherOptions(sortByModulePriority(otherData, name));

    if (!activeContractOption) {
      const _contract = highlightedData[0] || otherData[0];
      if (_contract) {
        void router.push(
          `/packages/${name}/${tag}/${variant}/interact/${_contract.moduleName}/${_contract.contractName}/${_contract.contractAddress}`
        );
      }
    }
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
    ? getExplorerUrl(
        packagesQuery.data?.chainId,
        contractAddress as viem.Address
      )
    : null;

  const isLoadingData = packagesQuery.isPending || deploymentData.isPending;

  if (!packagesQuery.isLoading && !packagesQuery.data) {
    throw new Error('Failed to fetch package');
  }

  return (
    <>
      {isLoadingData ? (
        <div className="py-20">
          <IpfsSpinner ipfsUrl={packagesQuery?.data?.deployUrl} />
        </div>
      ) : (
        <>
          <div className="sticky top-[--header-height] z-50 bg-muted">
            <div className="overflow-x-scroll overflow-y-hidden max-w-[100vw]">
              <Tabs
                defaultValue={
                  highlightedOptions[0]?.moduleName +
                  '::' +
                  highlightedOptions[0]?.contractName
                }
                value={
                  activeContractOption
                    ? `${activeContractOption.moduleName}::${activeContractOption.contractName}`
                    : undefined
                }
                onValueChange={(value) => {
                  const [moduleName, contractName] = value.split('::');
                  const option = [...highlightedOptions, ...otherOptions].find(
                    (opt) =>
                      opt.moduleName === moduleName &&
                      opt.contractName === contractName
                  );
                  if (option) {
                    void router.push(
                      buildInteractPath(
                        name,
                        tag,
                        variant,
                        option.moduleName,
                        option.contractName,
                        option.contractAddress
                      )
                    );
                  }
                }}
              >
                <TabsList className="h-full font-mono">
                  {highlightedOptions.map((option, i) => (
                    <TabsTrigger
                      key={i}
                      value={`${option.moduleName}::${option.contractName}`}
                      data-testid={`${option.contractName}-button`}
                    >
                      {`${option.moduleName}.${option.contractName}`}
                    </TabsTrigger>
                  ))}

                  {otherOptions.length > 0 && (
                    <Popover
                      open={isPopoverOpen}
                      onOpenChange={setIsPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <div
                          className="cursor-pointer bg-black p-1 border border-border rounded-md mx-2"
                          data-testid="other-option-section"
                        >
                          <MoreHorizontal className="h-4 w-4 text-white" />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="max-h-[320px] max-w-[320px] overflow-y-auto overflow-x-hidden w-full bg-background border border-border p-0">
                        {otherOptions.length > 5 && (
                          <div className="p-2">
                            <SearchInput
                              size="sm"
                              onSearchChange={setSearchTerm}
                            />
                          </div>
                        )}
                        {otherOptions
                          .filter((o) =>
                            searchTerm
                              ? o.contractName
                                  .toLowerCase()
                                  .includes(searchTerm)
                              : true
                          )
                          .map((option, i) => (
                            <div
                              key={i}
                              className={`cursor-pointer p-2 border-t border-border font-mono ${
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
                              data-testid={`${option.contractName}-button`}
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
                <div className="flex flex-col items-start md:flex-row md:items-center gap-3 md:gap-6 text-gray-300 text-xs font-mono text-muted-foreground">
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

                  <div className="flex items-center relative">
                    {explorerUrl ? (
                      <>
                        <a
                          className="no-underline hover:no-underline flex items-center"
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText className="h-[14px] w-[14px] mr-1.5" />
                          <span className="border-b border-dotted border-gray-300">
                            {contractAddress
                              ? `${contractAddress.substring(
                                  0,
                                  6
                                )}...${contractAddress.slice(-4)}`
                              : 'Loading...'}
                          </span>
                        </a>
                        <div className="absolute right-0 top-0 p-1">
                          {contractAddress && (
                            <ClipboardButton
                              text={contractAddress}
                              className="static ml-1 scale-75"
                            />
                          )}
                        </div>
                      </>
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
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Abi
            isLoading={isLoadingData}
            abi={contract?.abi}
            contractName={contract?.contractName ?? 'Unknown'}
            address={contractAddress!}
            cannonOutputs={cannonOutputs}
            chainId={packagesQuery.data!.chainId}
            isDrawerOpen={isDrawerOpen}
            onDrawerOpen={() => setIsDrawerOpen(true)}
            packageUrl={packagesQuery.data?.deployUrl}
          />
          <QueueDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onOpen={() => setIsDrawerOpen(true)}
          />
        </>
      )}
    </>
  );
};

export default Interact;
