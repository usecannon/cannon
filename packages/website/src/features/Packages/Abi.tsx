import { FC, useEffect, useMemo, useRef } from 'react';
import { Abi as AbiType, AbiFunction } from 'abitype/src/abi';
import { ChainArtifacts } from '@usecannon/builder';
import { Function } from '@/features/Packages/Function';
import {
  Flex,
  Text,
  Box,
  useBreakpointValue,
  AlertIcon,
  Alert,
  Heading,
  Link,
} from '@chakra-ui/react';
import NextLink from 'next/link';

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

  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.substring(1);
      if (hash && containerRef.current) {
        const section = containerRef.current.querySelector(
          `#${hash}`
        ) as HTMLElement | null;
        if (section) {
          // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
          window.scrollTo(0, 999999999999999999999);
          containerRef.current.scrollTop =
            section.offsetTop - containerRef.current.offsetTop;
        }
      }
    }

    window.addEventListener('hashchange', handleHashChange, false);

    const timerId = setTimeout(handleHashChange, 100); // Delay by 100ms

    return () => {
      window.removeEventListener('hashchange', handleHashChange, false);
      clearTimeout(timerId); // Clear the timeout when the component unmounts
    };
  }, []);

  function sanitizeForIdAndURI(anchor: string) {
    let sanitized = encodeURIComponent(anchor);
    sanitized = sanitized.replace(/%20/g, '_');
    if (/^[0-9]/.test(sanitized)) {
      sanitized = 'id_' + sanitized;
    }
    sanitized = sanitized.replace(/[^a-zA-Z0-9\-_]/g, '');
    return sanitized;
  }

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
                    href={`#${sanitizeForIdAndURI(
                      `${f.name}(${f.inputs
                        .map((i) => `${i.type}${i.name ? ' ' + i.name : ''}`)
                        .join(',')})`
                    )}`}
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
                    href={`#${sanitizeForIdAndURI(
                      `${f.name}(${f.inputs
                        .map((i) => `${i.type}${i.name ? ' ' + i.name : ''}`)
                        .join(',')})`
                    )}`}
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

          <Box
            flex="1"
            overflowY="auto"
            maxHeight={['none', 'none', 'calc(100vh - 185px)']}
            background="black"
            ref={containerRef}
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
