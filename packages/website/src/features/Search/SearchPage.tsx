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
} from '@chakra-ui/react';
import { useQueryCannonSubgraphData } from '@/hooks/subgraph';
import {
  TOTAL_PACKAGES,
  FILTERED_PACKAGES_AND_VARIANTS,
} from '@/graphql/queries';
import {
  GetTotalPackagesQuery,
  GetTotalPackagesQueryVariables,
  GetFilteredPackagesAndVariantsQuery,
  GetFilteredPackagesAndVariantsQueryVariables,
  Package,
} from '@/types/graphql/graphql';
import { SearchIcon } from '@chakra-ui/icons';
import { PackageCardExpandable } from './PackageCard/PackageCardExpandable';
import { CustomSpinner } from '@/components/CustomSpinner';
import { debounce } from 'lodash';

export const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');

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
    if (error) {
      console.log('error:', error);
    }

    const variantExistsInPackage = (pkg: Package, variantId: string): boolean =>
      pkg.variants.some((v) => v.id === variantId);

    const mergeResults = (
      data: GetFilteredPackagesAndVariantsQuery
    ): Package[] => {
      const packageMap: { [key: string]: Package } = {};

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
  }, [loading, error, data]);

  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  return (
    <Flex flex="1" direction="column" maxHeight="100%" maxWidth="100%">
      <Flex flex="1" direction={['column', 'column', 'row']}>
        <Flex
          flexDirection="column"
          overflowY="auto"
          maxWidth={['100%', '100%', '300px']}
          borderRight={isSmall ? 'none' : '1px solid'}
          borderColor="gray.700"
          width={['100%', '100%', '300px']}
          maxHeight={['none', 'none', 'calc(100vh - 100px)']}
        >
          <Box p={[4, 4, 8]} pb={[0, 0, 8]}>
            <InputGroup borderColor="gray.600">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.500" />
              </InputLeftElement>
              <Input onChange={(e) => debouncedHandleSearch(e.target.value)} />
            </InputGroup>
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
                    <PackageCardExpandable
                      maxHeight="186px"
                      pkg={pkg}
                      key={pkg.name}
                    />
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
