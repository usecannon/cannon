import QueueDrawer from '@/features/Deploy/QueueDrawer';
import { Abi } from '@/features/Packages/Abi';
import { SubnavContext } from '@/features/Packages/Tabs/InteractTab';
import { getPackage } from '@/helpers/api';
import chains from '@/helpers/chains';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { usePackageUrlParams } from '@/hooks/routing/usePackageUrlParams';
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
import { useQuery } from '@tanstack/react-query';
import {
  ChainArtifacts,
  ContractData,
  DeploymentInfo,
  PackageReference,
} from '@usecannon/builder';
import { FC, useContext, useEffect, useState } from 'react';

import { externalLinks } from '@/constants/externalLinks';

const Interact: FC = () => {
  const { variant, tag, name, moduleName, contractName, contractAddress } =
    usePackageUrlParams();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [chainId, preset] = PackageReference.parseVariant(variant);

  const packagesQuery = useQuery({
    queryKey: ['package', [`${name}:${tag}@${preset}/${chainId}`]],
    queryFn: getPackage,
  });

  const [cannonOutputs, setCannonOutputs] = useState<ChainArtifacts>({});
  const [contract, setContract] = useState<ContractData | undefined>();

  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    packagesQuery?.data?.data.deployUrl,
    !!packagesQuery?.data?.data.deployUrl
  );

  useEffect(() => {
    if (deploymentData.isPending || !deploymentData.data) {
      return;
    }

    const cannonOutputs: ChainArtifacts = getOutput(deploymentData.data);

    setCannonOutputs(cannonOutputs);

    const findContract = (
      contracts: any,
      parentModuleName: string,
      imports: any
    ) => {
      if (contracts) {
        Object.entries(contracts).forEach(([k, v]) => {
          if (
            parentModuleName === moduleName &&
            k === contractName &&
            (v as ContractData).address === contractAddress
          ) {
            setContract({
              ...(v as ContractData),
              contractName: k,
            });
            return;
          }
        });
      }

      if (imports) {
        Object.entries(imports).forEach(([k, v]) =>
          findContract(
            (v as any).contracts,
            parentModuleName && parentModuleName !== name
              ? `${parentModuleName}.${k}`
              : k,
            (v as any).imports
          )
        );
      }
    };
    findContract(cannonOutputs.contracts, name, cannonOutputs.imports);
  }, [deploymentData.data, contractName]);

  const deployUrl = `${
    externalLinks.IPFS_CANNON
  }${packagesQuery.data?.data.deployUrl.replace('ipfs://', '')}`;

  const etherscanUrl =
    (
      Object.values(chains).find(
        (chain) => chain.id === packagesQuery.data?.data?.chainId
      ) as any
    )?.blockExplorers?.default?.url ?? 'https://etherscan.io';

  const isMobile = useBreakpointValue([true, true, false]);

  const subnavContext = useContext(SubnavContext);

  const isLoadingData = packagesQuery.isPending || deploymentData.isPending;

  return (
    <>
      {/* Header */}
      <Flex
        position={{ md: 'sticky' }}
        top={subnavContext.hasSubnav ? 65 : 0}
        zIndex={3}
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
            <Link
              isExternal
              styleConfig={{ 'text-decoration': 'none' }}
              borderBottom="1px dotted"
              borderBottomColor="gray.300"
              href={`${etherscanUrl}/address/${contractAddress}`}
            >
              {isMobile && contractAddress
                ? `${contractAddress.substring(0, 6)}...${contractAddress.slice(
                    -4
                  )}`
                : contractAddress}
            </Link>
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
                  ? `${packagesQuery.data?.data.deployUrl.substring(
                      0,
                      13
                    )}...${packagesQuery.data?.data?.deployUrl.slice(-4)}`
                  : packagesQuery.data?.data?.deployUrl}
              </Link>
            </Text>
          </Flex>
        </Box>
      </Flex>

      <Abi
        isLoading={isLoadingData}
        abi={contract?.abi}
        contractSource={contract?.sourceName}
        address={contractAddress!}
        cannonOutputs={cannonOutputs}
        chainId={packagesQuery.data?.data?.chainId}
        onDrawerOpen={onOpen}
        packageUrl={packagesQuery.data?.data.deployUrl}
      />
      <QueueDrawer isOpen={isOpen} onClose={onClose} onOpen={onOpen} />
    </>
  );
};

export default Interact;
