'use client';

import { useEffect, useState } from 'react';
import {
  Flex,
  Box,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  useBreakpointValue,
  Container,
  Image,
  Link,
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
} from '@chakra-ui/react';
import { useQueryCannonSubgraphData } from '@/hooks/subgraph';
import {
  GET_PACKAGES,
  TOTAL_PACKAGES,
  FILTERED_PACKAGES_AND_VARIANTS,
} from '@/graphql/queries';
import {
  GetTotalPackagesQuery,
  GetTotalPackagesQueryVariables,
  GetFilteredPackagesAndVariantsQuery,
  GetFilteredPackagesAndVariantsQueryVariables,
  Package,
  GetPackagesQuery,
  GetPackagesQueryVariables,
} from '@/types/graphql/graphql';
import { SearchIcon } from '@chakra-ui/icons';
import { PackageCardExpandable } from './PackageCard/PackageCardExpandable';
import { CustomSpinner } from '@/components/CustomSpinner';
import { debounce } from 'lodash';
import { ChainFilter } from './ChainFilter';
import chains from '@/helpers/chains';

export const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedChains, setSelectedChains] = useState<number[]>([]);

  const toggleChainSelection = (id: number) => {
    setSelectedChains((prevSelectedChains) =>
      prevSelectedChains.includes(id)
        ? prevSelectedChains.filter((chainId) => chainId !== id)
        : [...prevSelectedChains, id]
    );
  };

  const { data: totalPackages, loading: totalLoading } =
    useQueryCannonSubgraphData<
      GetTotalPackagesQuery,
      GetTotalPackagesQueryVariables
    >(TOTAL_PACKAGES, {
      variables: { query: '' },
    });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };
  const debouncedHandleSearch = debounce(handleSearch, 300);

  const { loading, error, data } = useQueryCannonSubgraphData<
    GetFilteredPackagesAndVariantsQuery,
    GetFilteredPackagesAndVariantsQueryVariables
  >(FILTERED_PACKAGES_AND_VARIANTS, {
    variables: {
      query: searchTerm,
    },
  });

  const [results, setResults] = useState<
    GetFilteredPackagesAndVariantsQuery['packages']
  >([]);

  useEffect(() => {
    const variantExistsInPackage = (pkg: Package, variantId: string): boolean =>
      pkg.variants.some((v) => v.id === variantId);

    const mergeResults = (
      data: GetFilteredPackagesAndVariantsQuery
    ): Package[] => {
      let packageMap: { [key: string]: Package } = {};

      data?.packages?.forEach((pkg: any) => {
        packageMap[pkg.id] = { ...pkg };
      });

      data?.filteredVariants?.forEach((variant: any) => {
        const pkg = variant.cannon_package;
        if (packageMap[pkg.id]) {
          if (!variantExistsInPackage(packageMap[pkg.id], variant.id)) {
            packageMap[pkg.id] = {
              ...packageMap[pkg.id],
              variants: [...packageMap[pkg.id].variants, variant],
            };
          }
        } else {
          packageMap[pkg.id] = {
            ...pkg,
            variants: [variant],
          };
        }
      });

      const filterPackageMap = (
        packageMap: { [key: string]: Package },
        selectedChains: number[]
      ): { [key: string]: Package } => {
        const filteredMap: { [key: string]: Package } = {};

        for (const [key, pkg] of Object.entries(packageMap)) {
          // Check if any variant's chain_id matches any number in selectedChains
          if (
            pkg.variants.some((variant) =>
              selectedChains.includes(variant.chain_id)
            )
          ) {
            filteredMap[key] = pkg;
          }
        }

        return filteredMap;
      };

      if (selectedChains?.length > 0) {
        packageMap = filterPackageMap(packageMap, selectedChains);
      }

      const sortedPackages = Object.values(packageMap).sort((a, b) => {
        const latestUpdatedA = a.variants.reduce(
          (maxTimestamp, variant) =>
            Math.max(variant.last_updated, maxTimestamp),
          0
        );
        const latestUpdatedB = b.variants.reduce(
          (maxTimestamp, variant) =>
            Math.max(variant.last_updated, maxTimestamp),
          0
        );

        return latestUpdatedB - latestUpdatedA; // Descending order
      });

      return sortedPackages;
    };

    setResults(data ? mergeResults(data) : []);
  }, [loading, error, data, selectedChains]);

  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  // Chain filter stuff
  const { data: allPackages } = useQueryCannonSubgraphData<
    GetPackagesQuery,
    GetPackagesQueryVariables
  >(GET_PACKAGES, {
    variables: {
      first: 1000,
      skip: 0,
      query: searchTerm,
    },
  });

  const getAllChainIds = (
    packagesData: Package[]
  ): { mainnet: number[]; testnet: number[] } => {
    const mainnetChainIds = new Set<number>();
    const testnetChainIds = new Set<number>();

    packagesData?.forEach((packageItem) => {
      packageItem.tags.forEach((tag) => {
        tag.variants.forEach((variant) => {
          if (variant.chain_id) {
            // Check if the chain_id exists in the chains object and if it's a testnet
            const chain = Object.values(chains).find(
              (chain) => chain.id === variant.chain_id
            );
            if ((chain as any)?.testnet) {
              testnetChainIds.add(variant.chain_id);
            } else {
              mainnetChainIds.add(variant.chain_id);
            }
          }
        });
      });
    });

    return {
      mainnet: Array.from(mainnetChainIds),
      testnet: Array.from(testnetChainIds),
    };
  };

  // Get all chain IDs using the function
  const { mainnet, testnet } = getAllChainIds(
    (allPackages?.packages || []) as Package[]
  );

  // Sort the arrays in ascending order
  const sortedMainnetChainIds = mainnet.sort((a, b) => a - b);
  const sortedTestnetChainIds = testnet.sort((a, b) => a - b);

  // Ensure 13370 is at the front of the mainnetChainIds array
  const index13370 = sortedMainnetChainIds.indexOf(13370);
  if (index13370 > -1) {
    sortedMainnetChainIds.splice(index13370, 1);
    sortedMainnetChainIds.unshift(13370);
  }

  return (
    <Flex flex="1" direction="column" maxHeight="100%" maxWidth="100%">
      <Flex flex="1" direction={['column', 'column', 'row']}>
        <Flex
          flexDirection="column"
          overflowY="auto"
          maxWidth={['100%', '100%', '320px']}
          borderRight={isSmall ? 'none' : '1px solid'}
          borderColor="gray.700"
          width={['100%', '100%', '310px']}
          maxHeight={['none', 'none', 'calc(100vh - 100px)']}
        >
          <Box
            py={[4, 4, 8]}
            px={4}
            pb={[0, 0, 4]}
            maxHeight={{ base: '210px', md: 'none' }}
            overflowY="scroll"
            position="relative" // Added to position the pseudo-element
            sx={{
              '&::after': {
                content: '""', // Necessary for the pseudo-element to work
                position: 'sticky',
                bottom: 0,
                left: 0,
                right: 0,
                height: '12px', // Height of the shadow
                background:
                  'linear-gradient(to bottom, rgba(0, 0, 0, 0), #000000)', // Gradient shadow
                display: { base: 'block', md: 'none' }, // Only show on base breakpoint
              },
            }}
          >
            <InputGroup borderColor="gray.600" mb={[4, 4, 8]}>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.500" />
              </InputLeftElement>
              <Input onChange={(e) => debouncedHandleSearch(e.target.value)} />
            </InputGroup>

            <Text mb={1.5} color="gray.200" fontSize="sm" fontWeight={500}>
              Filter by Chain
            </Text>
            {sortedMainnetChainIds.map((id) => (
              <ChainFilter
                key={id}
                id={id}
                isSelected={selectedChains.includes(id)}
                toggleSelection={toggleChainSelection}
              />
            ))}

            <Accordion allowToggle>
              <AccordionItem border="none">
                <AccordionButton px={0} pb={0}>
                  <Text
                    fontWeight={500}
                    textTransform="uppercase"
                    letterSpacing="1px"
                    fontFamily="var(--font-miriam)"
                    fontSize="12px"
                    color="gray.300"
                    mr={0.5}
                  >
                    Testnets
                  </Text>
                  <Box transform="translateY(-0.1rem)">
                    <AccordionIcon color="gray.300" />
                  </Box>
                </AccordionButton>
                <AccordionPanel px={0} pb={0}>
                  {sortedTestnetChainIds.map((id) => (
                    <ChainFilter
                      key={id}
                      id={id}
                      isSelected={selectedChains.includes(id)}
                      toggleSelection={toggleChainSelection}
                    />
                  ))}
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Box>
          <Box
            px={3}
            py={[1, 1, 2]}
            mt="auto"
            borderTop={!totalLoading ? '1px solid' : 'none'}
            borderTopColor={['transparent', 'transparent', 'gray.700']}
          >
            {!totalLoading && (
              <Flex>
                <Image
                  src="/images/thegraph.svg"
                  alt="The Graph"
                  w="12px"
                  objectFit="contain"
                  mr={2}
                  ml={[2, 2, 0]}
                  transform="translateY(0.5px)"
                />
                <Text color="gray.400" fontSize="sm">
                  {totalPackages?.totalPackages?.length} packages indexed on{' '}
                  <Link
                    isExternal
                    fontWeight={500}
                    href="https://thegraph.com/hosted-service/subgraph/noahlitvin/cannon-registry-mainnet"
                  >
                    the subgraph
                  </Link>
                </Text>
              </Flex>
            )}
          </Box>
        </Flex>
        <Box
          flex="1"
          overflowY="auto"
          maxHeight={['none', 'none', 'calc(100vh - 100px)']}
        >
          {loading ? (
            <Flex
              justifyContent="center"
              alignItems="center"
              flex={1}
              height="100%"
            >
              <CustomSpinner />
            </Flex>
          ) : (
            <Box px={[0, 0, 4]} pt={isSmall ? 4 : 8}>
              <Container ml={0} maxWidth="container.xl">
                {results.map((pkg: any) => (
                  <Box mb="8" key={pkg.id}>
                    <PackageCardExpandable pkg={pkg} key={pkg.name} />
                  </Box>
                ))}
              </Container>
            </Box>
          )}
        </Box>
      </Flex>
    </Flex>
  );
};
