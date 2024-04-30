import { CustomSpinner } from '@/components/CustomSpinner';
import { Abi } from '@/features/Packages/Abi';
import { GET_PACKAGE } from '@/graphql/queries';
import chains from '@/helpers/chains';
import { useQueryIpfsData } from '@/hooks/ipfs';
import { useQueryCannonSubgraphData } from '@/hooks/subgraph';
import { getOutput } from '@/lib/builder';
import {
  Box,
  Code,
  Flex,
  Heading,
  Link,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import { ChainArtifacts, ContractData } from '@usecannon/builder/src';
import { FC, useContext, useEffect, useState } from 'react';
import { Address } from 'viem';
import { HasSubnavContext } from './Tabs/InteractTab';
import QueueDrawer from '@/features/Deploy/QueueDrawer';

export const Interact: FC<{
  name: string;
  tag: string;
  variant: string;
  moduleName: string;
  contractName: string;
  contractAddress: Address;
}> = ({ name, tag, variant, moduleName, contractName, contractAddress }) => {
  const { data } = useQueryCannonSubgraphData<any, any>(GET_PACKAGE, {
    variables: { name },
  });

  const [pkg, setPackage] = useState<any | null>(null);
  const [cannonOutputs, setCannonOutputs] = useState<ChainArtifacts>({});
  const [contract, setContract] = useState<ContractData | undefined>();

  useEffect(() => {
    if (data?.packages[0]) setPackage(data?.packages[0]);
  }, [data]);

  const currentVariant = pkg?.variants.find(
    (v: any) => v.name === variant && v.tag.name === tag
  );

  const { data: ipfs, isLoading } = useQueryIpfsData(
    currentVariant?.deploy_url,
    !!currentVariant?.deploy_url
  );

  useEffect(() => {
    if (!ipfs) {
      return;
    }

    const cannonOutputs: ChainArtifacts = getOutput(ipfs);
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
  }, [ipfs]);

  const deployUrl = `https://repo.usecannon.com/${currentVariant?.deploy_url.replace(
    'ipfs://',
    ''
  )}`;

  const etherscanUrl =
    (
      Object.values(chains).find(
        (chain) => chain.id === currentVariant?.chain_id
      ) as any
    )?.blockExplorers?.default?.url ?? 'https://etherscan.io';

  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  const hasSubnav = useContext(HasSubnavContext);

  return (
    <>
      {isLoading ? (
        <Box py="20" textAlign="center">
          <CustomSpinner mx="auto" />
        </Box>
      ) : (
        <>
          <Flex
            position={{ md: 'sticky' }}
            top={hasSubnav ? 65 : 0}
            zIndex={3}
            bg="gray.800"
            p={2}
            flexDirection={['column', 'column', 'row']}
            alignItems={['flex-start', 'flex-start', 'center']}
            borderBottom="1px solid"
            borderColor="gray.600"
          >
            <Box py={2} px={[1, 1, 3]}>
              <Heading display="inline-block" as="h4" size="md" mb={1.5}>
                {contract?.contractName}
              </Heading>
              <Text color="gray.300" fontSize="xs" fontFamily="mono">
                <Link
                  isExternal
                  styleConfig={{ 'text-decoration': 'none' }}
                  borderBottom="1px dotted"
                  borderBottomColor="gray.300"
                  href={`${etherscanUrl}/address/${contractAddress}`}
                >
                  {isSmall
                    ? `${contractAddress.substring(
                        0,
                        6
                      )}...${contractAddress.slice(-4)}`
                    : contractAddress}
                </Link>
              </Text>
            </Box>
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
                    {isSmall
                      ? `${currentVariant?.deploy_url.substring(
                          0,
                          13
                        )}...${currentVariant?.deploy_url.slice(-4)}`
                      : currentVariant?.deploy_url}
                  </Link>
                </Text>
              </Flex>
            </Box>
          </Flex>
          <Abi
            abi={contract?.abi}
            contractSource={contract?.sourceName}
            address={contractAddress}
            cannonOutputs={cannonOutputs}
            chainId={currentVariant?.chain_id}
          />
          <QueueDrawer />
        </>
      )}
    </>
  );
};
