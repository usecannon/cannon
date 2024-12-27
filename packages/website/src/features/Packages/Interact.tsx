'use client';

import QueueDrawer from '@/features/Deploy/QueueDrawer';
import { Abi } from '@/features/Packages/Abi';
import { SubnavContext } from '@/features/Packages/Tabs/InteractTab';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { usePackageNameTagVersionUrlParams } from '@/hooks/routing/usePackageVersionUrlParams';
import { getOutput } from '@/lib/builder';
import {
  Box,
  Code,
  Flex,
  Heading,
  Link,
  Skeleton,
  Text,
  useBreakpointValue,
  useDisclosure,
} from '@chakra-ui/react';
import {
  ChainArtifacts,
  ContractData,
  DeploymentInfo,
  PackageReference,
} from '@usecannon/builder';
import { FC, useContext, useEffect, useState } from 'react';

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

  const isMobile = useBreakpointValue([true, true, false]);

  const subnavContext = useContext(SubnavContext);

  const isLoadingData = packagesQuery.isPending || deploymentData.isPending;

  if (!packagesQuery.isLoading && !packagesQuery.data) {
    throw new Error('Failed to fetch package');
  }

  return (
    <>
      {/* Header */}
      <Flex
        position={{ md: 'sticky' }}
        top={subnavContext.hasSubnav ? 57 : 0}
        zIndex={120}
        bg="gray.800"
        p={2}
        flexDirection={['column', 'column', 'row']}
        alignItems={['flex-start', 'flex-start', 'center']}
        borderBottom="1px solid"
        borderColor="gray.600"
      >
        {/* Token */}
        <Box py={2} px={[1, 1, 3]}>
          <Heading display="inline-block" as="h4" size="md" mb={1.5}>
            {isLoadingData ? (
              <Skeleton height={1} width={100} mt={1} mb={1} />
            ) : (
              contract?.contractName
            )}
          </Heading>
          <Text color="gray.300" fontSize="xs" fontFamily="mono">
            {explorerUrl ? (
              <Link
                isExternal
                styleConfig={{ 'text-decoration': 'none' }}
                borderBottom="1px dotted"
                borderBottomColor="gray.300"
                href={explorerUrl}
              >
                {isMobile && contractAddress
                  ? `${contractAddress.substring(
                      0,
                      6
                    )}...${contractAddress.slice(-4)}`
                  : contractAddress}
              </Link>
            ) : null}
          </Text>
        </Box>

        {/* IPFS Url */}
        <Box p={1} ml={[0, 0, 'auto']}>
          <Flex
            justifyContent={['flex-start', 'flex-start', 'flex-end']}
            flexDirection="column"
            textAlign={['left', 'left', 'right']}
          >
            <Text fontSize="xs" color="gray.200" display="inline" mb={0.5}>
              via{' '}
              <Code fontSize="xs" color="gray.200" pr={0} pl={0.5}>
                {moduleName}
              </Code>
            </Text>
            <Text color="gray.300" fontSize="xs" fontFamily="mono">
              <Link
                isExternal
                styleConfig={{ 'text-decoration': 'none' }}
                borderBottom="1px dotted"
                borderBottomColor="gray.300"
                href={deployUrl}
              >
                {isMobile
                  ? `${packagesQuery.data?.deployUrl.substring(
                      0,
                      13
                    )}...${packagesQuery.data?.deployUrl.slice(-4)}`
                  : packagesQuery.data?.deployUrl}
              </Link>
            </Text>
          </Flex>
        </Box>
      </Flex>

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
