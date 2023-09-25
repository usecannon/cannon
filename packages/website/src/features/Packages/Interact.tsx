import { FC, useEffect, useMemo, useState } from 'react';
import { Box, Code, Flex, Heading, Link, Text } from '@chakra-ui/react';
import axios from 'axios';
import pako from 'pako';
import { ChainArtifacts } from '@usecannon/builder/src';
import { getOutput } from '@/lib/builder';
import { ProvisionStep } from '@/features/Packages/ProvisionStep';
import { CustomSpinner } from '@/components/CustomSpinner';

export const Interact: FC<{ variant: any }> = ({ variant }) => {
  const [loading, setLoading] = useState(true);
  const [ipfs, setIpfs] = useState<any>({});
  const [cannonOutputs, setCannonOutputs] = useState<ChainArtifacts>({});

  const output = useMemo(() => {
    return {
      '': {
        title: '',
        url: '',
        imports: cannonOutputs?.imports,
        contracts: cannonOutputs?.contracts,
      },
    };
  }, [cannonOutputs]);

  useEffect(() => {
    if (!variant) return;
    setLoading(true);

    const controller = new AbortController();

    const url = `https://ipfs.io/ipfs/${variant?.deploy_url.replace(
      'ipfs://',
      ''
    )}`;

    axios
      .get(url, { responseType: 'arraybuffer' })
      .then((response) => {
        // Parse IPFS data
        const uint8Array = new Uint8Array(response.data);
        const inflated = pako.inflate(uint8Array);
        const raw = new TextDecoder().decode(inflated);
        const _ipfs = JSON.parse(raw);
        setIpfs(_ipfs);

        // Get Builder Outputs
        setCannonOutputs(getOutput(_ipfs));
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [variant]);

  return (
    <Box position="relative">
      {loading ? (
        <Box py="20" textAlign="center">
          <CustomSpinner mx="auto" />
        </Box>
      ) : (
        <Box>
          <ProvisionStep
            imports={output}
            cannonOutputs={cannonOutputs}
            chainId={variant?.chain_id}
          />
        </Box>
      )}
    </Box>
  );
};

export const InteractTabPrototype: FC<{
  contractAddress: string;
}> = ({ contractAddress }) => {
  return (
    <>
      <Box
        bg="black"
        display="block"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="gray.600"
        borderRadius="4px"
        transition="all 0.12s"
        overflow="hidden"
      >
        <Flex
          bg="gray.800"
          p={2}
          flexDirection={['column', 'column', 'row']}
          alignItems={['flex-start', 'flex-start', 'center']}
          borderBottom="1px solid"
          borderColor="gray.600"
        >
          <Box py={2} px={[1, 1, 3]}>
            <Heading display="inline-block" as="h4" size="md" mb={1.5}>
              PerpsMarketProxy
            </Heading>
            <Text color="gray.300" fontSize="xs" fontFamily="mono">
              <Link
                isExternal
                styleConfig={{ 'text-decoration': 'none' }}
                borderBottom="1px dotted"
                borderBottomColor="gray.300"
                href={`https://etherscan.io/address/0x}`}
              >
                0x0000...0000
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
                  provision.perpsFactory
                </Code>
              </Text>
              <Text color="gray.300" fontSize="xs" fontFamily="mono">
                <Link
                  isExternal
                  styleConfig={{ 'text-decoration': 'none' }}
                  borderBottom="1px dotted"
                  borderBottomColor="gray.300"
                  href={`https://etherscan.io/address/0x}`}
                >
                  ipfs://qMabcd...1234
                </Link>
              </Text>
            </Flex>
          </Box>
        </Flex>

        <Box p={6}>
          <Text fontSize="xs" color="gray.500">
            Contract Address: {contractAddress}
            <br />
            Functions listed here
          </Text>
        </Box>
      </Box>
    </>
  );
};
