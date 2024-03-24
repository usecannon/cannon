import {
  Alert,
  AlertIcon,
  Box,
  Flex,
  Heading,
  Link,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import * as viem from 'viem';
import NextLink from 'next/link';
import { ChainArtifacts } from '@usecannon/builder';
import { FC, useContext, useEffect, useMemo, useRef } from 'react';
import { Abi as AbiType, AbiFunction } from 'abitype/src/abi';

import { Function } from '@/features/Packages/Function';
import { HasSubnavContext } from './Tabs/InteractTab';

export const Abi: FC<{
  abi: AbiType;
  address: viem.Address;
  cannonOutputs: ChainArtifacts;
  chainId: number;
}> = ({ abi, address, cannonOutputs, chainId }) => {
  const functions = useMemo<AbiFunction[]>(
    () => abi?.filter((a) => a.type === 'function') as AbiFunction[],
    [abi]
  );

  const readFunctions = functions
    ?.filter((func) => ['view', 'pure'].includes(func.stateMutability))
    .sort((a, b) => a.name.localeCompare(b.name));

  const writeFunctions = functions
    ?.filter((func) => !['view', 'pure'].includes(func.stateMutability))
    .sort((a, b) => a.name.localeCompare(b.name));

  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  const hasSubnav = useContext(HasSubnavContext);

  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.substring(1);
      if (hash) {
        const section = document.querySelector(
          `#${hash}`
        ) as HTMLElement | null;
        if (section) {
          const topOffset =
            section.getBoundingClientRect().top +
            window.pageYOffset -
            (isSmall ? 24 : 102);
          // eslint-disable-next-line @typescript-eslint/no-loss-of-precision

          window.scrollTo(0, topOffset - (hasSubnav ? 65 : 0));
        }
      }
    }

    window.addEventListener('hashchange', handleHashChange, false);

    const timerId = setTimeout(handleHashChange, 100); // Delay by 100ms

    return () => {
      window.removeEventListener('hashchange', handleHashChange, false);
      clearTimeout(timerId); // Clear the timeout when the component unmounts
    };
  }, [functions]);

  return (
    <Flex flex="1" direction="column" maxWidth="100%">
      <Flex flex="1" direction={['column', 'column', 'row']}>
        <Flex
          flexDirection="column"
          maxWidth={['100%', '100%', '320px']}
          borderRight={isSmall ? 'none' : '1px solid'}
          borderBottom={isSmall ? '1px solid' : 'none'}
          borderColor={isSmall ? 'gray.600' : 'gray.700'}
          width={['100%', '100%', '320px']}
          maxHeight={['190px', '190px', 'none']}
          top="0"
        >
          <Box
            px={3}
            pb={2}
            position={{ md: 'sticky' }}
            top={hasSubnav ? 81 + 65 : 81}
            maxHeight={{ base: '100%', md: 'calc(100vh - 81px)' }}
            overflowY="auto"
          >
            <Box mt={4}>
              <Flex flexDirection="row" px="2" alignItems="center" mb="1.5">
                <Heading
                  fontWeight="500"
                  size="sm"
                  color="gray.200"
                  letterSpacing="0.1px"
                >
                  Read Functions
                </Heading>
              </Flex>

              {readFunctions?.map((f, index) => (
                <Link
                  as={NextLink}
                  display="block"
                  borderRadius="md"
                  mb={0.5}
                  py={0.5}
                  px="2"
                  cursor="pointer"
                  fontSize="sm"
                  _hover={{ background: 'gray.800' }}
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  key={index}
                  href={`#selector-${viem.toFunctionSelector(f)}`}
                  textDecoration="none"
                >
                  {f.name}(
                  {f.inputs
                    .map((i) => i.type + (i.name ? ' ' + i.name : ''))
                    .join(',')}
                  )
                </Link>
              ))}
            </Box>
            <Box mt={4}>
              <Flex flexDirection="row" px="2" alignItems="center" mb="1.5">
                <Heading
                  fontWeight="500"
                  size="sm"
                  color="gray.200"
                  letterSpacing="0.1px"
                >
                  Write Functions
                </Heading>
              </Flex>
              {writeFunctions?.map((f, index) => (
                <Link
                  as={NextLink}
                  display="block"
                  borderRadius="md"
                  mb={0.5}
                  py={0.5}
                  px="2"
                  cursor="pointer"
                  fontSize="sm"
                  _hover={{ background: 'gray.800' }}
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  key={index}
                  href={`#selector-${viem.toFunctionSelector(f)}`}
                  textDecoration="none"
                >
                  {f.name}(
                  {f.inputs
                    .map((i) => i.type + (i.name ? ' ' + i.name : ''))
                    .join(',')}
                  )
                </Link>
              ))}
            </Box>
          </Box>
        </Flex>

        <Box background="black" ref={containerRef} w="100%">
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
  );
};
