import { FC, useMemo } from 'react';
import { Abi as AbiType, AbiFunction } from 'abitype/src/abi';
import { ChainArtifacts } from '@usecannon/builder';
import { Function } from '@/features/Packages/Function';
import {
  Flex,
  Text,
  Link,
  Box,
  useBreakpointValue,
  AlertIcon,
  Alert,
} from '@chakra-ui/react';

export const Abi: FC<{
  abi: AbiType;
  address: string;
  cannonOutputs: ChainArtifacts;
  chainId: number;
}> = ({ abi, address, cannonOutputs, chainId }) => {
  const functions = useMemo<AbiFunction[]>(
    () => abi?.filter((a) => a.type === 'function') as AbiFunction[],
    [abi]
  );

  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  return (
    <>
      <Flex flex="1" direction="column" maxHeight="100%" maxWidth="100%">
        <Flex flex="1" direction={['column', 'column', 'row']}>
          <Flex
            flexDirection="column"
            overflowY="auto"
            maxWidth={['100%', '100%', '300px']}
            borderRight={isSmall ? 'none' : '1px solid'}
            borderBottom={isSmall ? '1px solid' : 'none'}
            borderColor={isSmall ? 'gray.600' : 'gray.700'}
            width={['100%', '100%', '300px']}
            maxHeight={['140px', '140px', 'calc(100vh - 185px)']}
          >
            <Box px={3} pb={2}>
              <Text fontSize="xs" fontWeight="semibold">
                View Functions
              </Text>
              {functions?.map((f, index) => (
                <Link
                  display="block"
                  fontSize="xs"
                  color="gray.200"
                  key={index}
                  mr={2}
                >
                  {f.name}(
                  {f.inputs
                    .map((i) => i.type + (i.name ? ' ' + i.name : ''))
                    .join(',')}
                  )
                </Link>
              ))}
              <Text fontSize="xs" fontWeight="semibold">
                Write Functions
              </Text>
              {functions?.map((f, index) => (
                <Link
                  display="block"
                  fontSize="xs"
                  color="gray.200"
                  key={index}
                  mr={2}
                >
                  {f.name}(
                  {f.inputs
                    .map((i) => i.type + (i.name ? ' ' + i.name : ''))
                    .join(',')}
                  )
                </Link>
              ))}
            </Box>
          </Flex>

          <Box
            flex="1"
            overflowY="auto"
            maxHeight={['none', 'none', 'calc(100vh - 185px)']}
            background="black"
          >
            <Alert status="warning" bg="gray.900" borderRadius="sm">
              <AlertIcon />
              <Text fontWeight="bold">
                Always review transactions carefully in your wallet application
                prior to execution.
              </Text>
            </Alert>

            {functions?.map((f, index) => (
              <Function
                key={index}
                f={f}
                abi={abi}
                address={address}
                cannonOutputs={cannonOutputs}
                chainId={chainId}
              />
            ))}
          </Box>
        </Flex>
      </Flex>
    </>
  );
};
