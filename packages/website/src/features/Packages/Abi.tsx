import {
  Alert,
  AlertIcon,
  Box,
  Flex,
  Heading,
  Skeleton,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import sortBy from 'lodash/sortBy';
import * as viem from 'viem';
import { ChainArtifacts } from '@usecannon/builder';
import { FC, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AbiFunction, Abi as AbiType } from 'abitype';
import { Function } from '@/features/Packages/Function';
import { SubnavContext } from './Tabs/InteractTab';
import SearchInput from '@/components/SearchInput';
import { scroller, Element, scrollSpy } from 'react-scroll';

import { Button, ButtonProps } from '@chakra-ui/react';
import React from 'react';
import { useRouter } from 'next/router';
import { CustomSpinner } from '@/components/CustomSpinner';

const getSelectorSlug = (f: AbiFunction) =>
  `selector-${viem.toFunctionSelector(f)}`;

const ButtonLink: React.FC<ButtonProps & { selected?: boolean }> = ({
  children,
  selected,
  ...props
}) => (
  <Button
    display="block"
    borderRadius="md"
    w="100%"
    textAlign="left"
    px="2"
    cursor={props.disabled ? 'not-allowed' : 'pointer'}
    fontSize="xs"
    _hover={{ background: 'gray.800' }}
    whiteSpace="nowrap"
    overflow="hidden"
    textOverflow="ellipsis"
    color="white"
    background={selected ? 'gray.800' : 'transparent'}
    height={30}
    {...props}
  >
    {children}
  </Button>
);

const FunctionRowsSkeleton = () => (
  <Flex direction="column" gap={2}>
    {Array.from({ length: 7 }).map((_, i) => (
      <Skeleton key={i} height={3} />
    ))}
  </Flex>
);

export const Abi: FC<{
  isLoading?: boolean;
  abi?: AbiType;
  address: viem.Address;
  cannonOutputs: ChainArtifacts;
  chainId: number;
  contractSource?: string;
  onDrawerOpen?: () => void;
  packageUrl?: string;
}> = ({
  isLoading,
  abi,
  contractSource,
  address,
  cannonOutputs,
  chainId,
  onDrawerOpen,
  packageUrl,
}) => {
  const router = useRouter();
  const isSmall = useBreakpointValue([true, true, false]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const hasSubnav = useContext(SubnavContext);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedSelector, setSelectedSelector] = useState<string | null>(null);
  const [scrollInitialized, setScrollInitialized] = useState(false);

  const allContractMethods = useMemo<AbiFunction[]>(
    () =>
      sortBy(abi?.filter((a) => a.type === 'function') as AbiFunction[], [
        'name',
      ]),
    [abi]
  );

  const readContractMethods = useMemo(
    () =>
      sortBy(
        allContractMethods?.filter((func) =>
          ['view', 'pure'].includes(func.stateMutability)
        ),
        ['name']
      ),
    [allContractMethods]
  );

  const writeContractMethods = useMemo(
    () =>
      sortBy(
        allContractMethods?.filter(
          (func) => !['view', 'pure'].includes(func.stateMutability)
        ),
        ['name']
      ),
    [allContractMethods]
  );

  const scrollOptions = useMemo(
    () => ({
      duration: 1200,
      smooth: true,
      offset: (102 + (hasSubnav ? 65 : 0)) * -1,
    }),
    [hasSubnav]
  );

  const onSelectedSelector = async (newSelector: string) => {
    // set the selector
    setSelectedSelector(newSelector);

    // scroll to the element
    scroller.scrollTo(newSelector, scrollOptions);

    await router.push(`${router.asPath.split('#')[0]}#${newSelector}`);
  };

  const handleMethodClick = async (functionSelector: AbiFunction) => {
    const newSelector = getSelectorSlug(functionSelector);
    if (newSelector === selectedSelector) {
      return;
    }

    await onSelectedSelector(newSelector);
  };

  // Updating scrollSpy when the component mounts.
  useEffect(() => {
    scrollSpy.update();
  }, []);

  // Make the auto scroll after the page loads if the url has a selector
  useEffect(() => {
    if (scrollInitialized) return;

    const urlSelectorFromPath = router.asPath.split('#')[1];
    if (urlSelectorFromPath || !selectedSelector) {
      setSelectedSelector(urlSelectorFromPath);

      // Add a timeout to delay the scroll
      const timeoutId = setTimeout(() => {
        scroller.scrollTo(urlSelectorFromPath, scrollOptions);
        setScrollInitialized(true);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [
    hasSubnav,
    router.asPath,
    scrollOptions,
    selectedSelector,
    scrollInitialized,
  ]);

  return (
    <Flex flex="1" direction="column" maxWidth="100%">
      <Flex flex="1" direction={['column', 'column', 'row']}>
        {/* Methods Sidebar */}
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
              <SearchInput onSearchChange={setSearchTerm} />
            </Box>

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

              {isLoading ? (
                <FunctionRowsSkeleton />
              ) : (
                readContractMethods
                  ?.filter((f) =>
                    f.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((f, index) => (
                    <ButtonLink
                      key={index}
                      selected={selectedSelector == getSelectorSlug(f)}
                      onClick={() => handleMethodClick(f)}
                    >
                      {f.name}(
                      {f.inputs
                        .map((i) => i.type + (i.name ? ' ' + i.name : ''))
                        .join(',')}
                      )
                    </ButtonLink>
                  ))
              )}
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
              {isLoading ? (
                <FunctionRowsSkeleton />
              ) : (
                writeContractMethods
                  ?.filter((f) =>
                    f.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((f, index) => (
                    <ButtonLink
                      key={index}
                      selected={selectedSelector == getSelectorSlug(f)}
                      onClick={() => handleMethodClick(f)}
                    >
                      {f.name}(
                      {f.inputs
                        .map((i) => i.type + (i.name ? ' ' + i.name : ''))
                        .join(',')}
                      )
                    </ButtonLink>
                  ))
              )}
            </Box>
          </Box>
        </Flex>

        {/* Methods Interactions */}
        <Flex background="black" ref={containerRef} w="100%" direction="column">
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
            flex={1}
            overflowX="auto"
          >
            {isLoading ? (
              <Flex align="center" justify="center" flex={1}>
                <CustomSpinner />
              </Flex>
            ) : (
              allContractMethods?.map((f) => (
                <Element
                  name={getSelectorSlug(f)}
                  key={`${address}-${getSelectorSlug(f)}`}
                >
                  <Function
                    selected={selectedSelector == getSelectorSlug(f)}
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
                </Element>
              ))
            )}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
