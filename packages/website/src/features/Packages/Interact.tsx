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
import { FC, useEffect, useState } from 'react';

import { externalLinks } from '@/constants/externalLinks';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { usePackageByRef } from '@/hooks/api/usePackage';

const Interact: FC = () => {
  const { variant, tag, name, moduleName, contractName, contractAddress } =
    usePackageNameTagVersionUrlParams();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { getExplorerUrl } = useCannonChains();

  const [chainId, preset] = PackageReference.parseVariant(variant);

  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });

  const [cannonOutputs, setCannonOutputs] = useState<ChainArtifacts>({});
  const [contract, setContract] = useState<ContractData | undefined>();

  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    packagesQuery?.data?.deployUrl,
    !!packagesQuery?.data?.deployUrl
  );

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
      {/* Header */}
      <div
        className={`
          flex flex-col md:flex-row bg-background
          p-2 border-b border-border
          sticky top-[107px]
          z-50 items-start md:items-center
        `}
      >
        {/* Token */}
        <div className="p-1">
          <h4 className="inline-block font-bold mr-2.5">
            {isLoadingData ? (
              <div className="h-4 w-[100px] mt-1 mb-1 animate-pulse bg-gray-700" />
            ) : (
              contract?.contractName
            )}
          </h4>

          <a
            className="text-xs text-muted-foreground no-underline border-b border-dotted border-gray-300 font-mono cursor-pointer"
            href={`/packages/${name}/${tag}/${variant}/code/${moduleName}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {contract?.sourceName}
          </a>
        </div>

        {/* IPFS Url */}
        <div className="p-1 md:ml-auto">
          <div className="flex flex-col items-start md:items-end">
            <p className="text-xs text-muted-foreground">
              {explorerUrl ? (
                <a
                  className="no-underline border-b border-dotted border-gray-300 font-mono cursor-pointer"
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {contractAddress.substring(0, 6)}...
                  {contractAddress.slice(-4)}
                </a>
              ) : null}{' '}
              {moduleName !== name ? (
                <>
                  from{' '}
                  <a
                    className="no-underline border-b border-dotted border-gray-300 font-mono cursor-pointer"
                    href={deployUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {`[clone.${moduleName}]`}
                  </a>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>

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
  );
};

export default Interact;
