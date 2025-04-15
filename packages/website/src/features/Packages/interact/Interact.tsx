'use client';

import { FC, useEffect, useState } from 'react';
import QueueDrawer from '@/features/Deploy/QueueDrawer';
import { Abi } from '@/features/Packages/Abi';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { usePackageNameTagVersionUrlParams } from '@/hooks/routing/usePackageVersionUrlParams';
import { DeploymentInfo, PackageReference } from '@usecannon/builder';
import { useRouter } from 'next/router';
import * as viem from 'viem';
import { IpfsSpinner } from '@/components/IpfsSpinner';
import { externalLinks } from '@/constants/externalLinks';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { usePackageByRef } from '@/hooks/api/usePackage';
import { useActiveContract } from './useActiveContract';
import { useDeploymentContracts } from './useDeploymentContracts';
import { useProcessedOptions } from './useProcessedOptions';
import { ContractsList } from './ContractsList';
import { ContractHeaderInfo } from './ContractHeaderInfo';

const Interact: FC = () => {
  const router = useRouter();
  const { variant, tag, name, contractAddress } =
    usePackageNameTagVersionUrlParams();
  const activeContractOption = useActiveContract();
  const { getExplorerUrl } = useCannonChains();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [chainId, preset] = PackageReference.parseVariant(variant);
  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });
  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    packagesQuery?.data?.deployUrl,
    !!packagesQuery?.data?.deployUrl
  );

  const { cannonOutputs, contract } = useDeploymentContracts(
    deploymentData.data
  );

  const { highlightedOptions, otherOptions } = useProcessedOptions(
    deploymentData.data,
    name
  );

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

  /**
   * Handles the initial contract selection and navigation when no active contract is selected
   */
  useEffect(() => {
    if (!deploymentData.data || activeContractOption) {
      return;
    }

    const _contract = highlightedOptions[0] || otherOptions[0];
    if (_contract) {
      void router.push(
        `/packages/${name}/${tag}/${variant}/interact/${_contract.moduleName}/${_contract.contractName}/${_contract.contractAddress}`
      );
    }
  }, [
    activeContractOption,
    deploymentData.data,
    name,
    router,
    tag,
    variant,
    highlightedOptions,
    otherOptions,
  ]);

  if (isLoadingData) {
    return (
      <div className="py-20">
        <IpfsSpinner ipfsUrl={packagesQuery?.data?.deployUrl} />
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-[--header-height] z-50 bg-muted">
        <ContractsList
          highlightedOptions={highlightedOptions}
          otherOptions={otherOptions}
        />

        <ContractHeaderInfo
          contract={contract}
          contractAddress={contractAddress}
          name={name}
          tag={tag}
          variant={variant}
          explorerUrl={explorerUrl}
          deployUrl={deployUrl}
        />
      </div>

      {/* Interact with Contract methods */}
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

      {/* Safe Txs */}
      <QueueDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpen={() => setIsDrawerOpen(true)}
      />
    </>
  );
};

export default Interact;
