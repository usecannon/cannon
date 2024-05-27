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
import _ from 'lodash';
import * as viem from 'viem';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { ChainArtifacts } from '@usecannon/builder';
import { FC, useContext, useEffect, useMemo, useRef } from 'react';
import { AbiFunction, Abi as AbiType } from 'abitype/src/abi';
import { Function } from '@/features/Packages/Function';
import { HasSubnavContext } from './Tabs/InteractTab';

export const Abi: FC<{
  abi?: AbiType;
  address: viem.Address;
  cannonOutputs: ChainArtifacts;
  chainId: number;
  contractSource?: string;
  onDrawerOpen?: () => void;
  packageUrl?: string;
}> = ({
  abi,
  contractSource,
  address,
  cannonOutputs,
  chainId,
  onDrawerOpen,
  packageUrl,
}) => {
  const params = useRouter().query;

  const functions = useMemo<AbiFunction[]>(
    () =>
      _.sortBy(abi?.filter((a) => a.type === 'function') as AbiFunction[], [
        'name',
      ]),
    [abi]
  );

  const readFunctions = useMemo<AbiFunction[]>(
    () =>
      _.sortBy(
        functions?.filter((func) =>
          ['view', 'pure'].includes(func.stateMutability)
        ),
        ['name']
      ),
    [functions]
  );

  const writeFunctions = useMemo<AbiFunction[]>(
    () =>
      _.sortBy(
        functions?.filter(
          (func) => !['view', 'pure'].includes(func.stateMutability)
        ),
        ['name']
      ),
    [functions]
  );

  const isSmall = useBreakpointValue([true, true, false]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const hasSubnav = useContext(HasSubnavContext);

  const handleHashChange = (firstRender: boolean) => {
    const hash = window.location.hash;

    if (hash) {
      const section = document.getElementById(`${hash}`);

      if (section) {
        const adjust = firstRender ? 162 : 102;

        const topOffset =
          section.getBoundingClientRect().top + window.scrollY - adjust;

        const button = section.querySelector('h2');

        if (button) {
          // open the collapsible
          button.click();
        }

        window.scrollTo(0, topOffset - (hasSubnav ? 65 : 0));
      }
    }
  };

  // hash changed
  useEffect(() => {
    handleHashChange(false);
  }, [params]);

  // first render
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleHashChange(true);
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

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
                  scroll={false}
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
                  scroll={false}
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
          <Alert
            status="warning"
            bg="gray.900"
            borderBottom="1px solid"
            borderColor="gray.700"
          >
            <AlertIcon />
            <Text fontWeight="bold">
              Always review transactions carefully in your wallet application
              prior to execution.
            </Text>
          </Alert>

          <Flex
            direction="column"
            px={4}
            py={4}
            borderBottom="1px solid"
            borderColor="gray.700"
            gap={4}
          >
            {functions?.map((f, index) => (
              <Function
                key={index}
                f={f}
                abi={abi as AbiType}
                address={address}
                cannonOutputs={cannonOutputs}
                chainId={chainId}
                contractSource={contractSource}
                onDrawerOpen={onDrawerOpen}
                collapsible
                showFunctionSelector={false}
                packageUrl={packageUrl}
              />
            ))}
          </Flex>
        </Box>
      </Flex>
    </Flex>
  );
};
