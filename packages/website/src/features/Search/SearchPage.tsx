'use client';

import { useEffect, useState } from 'react';
import {
  //Button,
  Flex,
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  //Text,
  useBreakpointValue,
  Container,
} from '@chakra-ui/react';
import { useQuery } from '@apollo/client';
import {
  //GET_PACKAGES,
  //TOTAL_PACKAGES,
  FILTERED_PACKAGES_AND_VARIANTS,
} from '@/graphql/queries';
import {
  //GetPackagesQuery,
  //GetPackagesQueryVariables,
  //GetTotalPackagesQuery,
  //GetTotalPackagesQueryVariables,
  GetFilteredPackagesAndVariantsQuery,
  GetFilteredPackagesAndVariantsQueryVariables,
  Package,
} from '@/types/graphql/graphql';
import { SearchIcon } from '@chakra-ui/icons';
import { PackageCard } from './PackageCard/PackageCard';
import { Variant } from 'framer-motion';

export const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  /*
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pageSize = 20;

  const { loading, error, data } = useQuery<
    GetPackagesQuery,
    GetPackagesQueryVariables
  >(GET_PACKAGES, {
    variables: {
      query: searchTerm,
      skip: pageSize * (page - 1),
      first: pageSize,
    },
  });
  const { data: totalPackages, loading: totalLoading } = useQuery<
    GetTotalPackagesQuery,
    GetTotalPackagesQueryVariables
  >(TOTAL_PACKAGES, {
    variables: { query: searchTerm },
  });

  const [packages, setPackages] = useState<GetPackagesQuery['packages']>([]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);
  
  useEffect(() => {
    if (error) {
      console.log('error:', error);
    }
    setPackages(data?.packages || []);
  }, [loading, error, data]);
  useEffect(() => {
    setTotalPages(
      Math.ceil((totalPackages?.totalPackages?.length || 0) / pageSize)
    );
  }, [totalPackages]);
*/

  const handleSearch = (e: any) => {
    setSearchTerm(e.target.value);
  };

  const { loading, error, data } = useQuery<
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

      data?.packages?.forEach((pkg: Package) => {
        packageMap[pkg.id] = { ...pkg };
      });

      data?.filteredVariants?.forEach((variant: Variant) => {
        const pkg = variant.cannon_package;
        if (packageMap[pkg.id]) {
          if (!variantExistsInPackage(packageMap[pkg.id], variant.id)) {
            packageMap[pkg.id].variants.push(variant);
          }
        } else {
          packageMap[pkg.id] = {
            ...pkg,
            variants: [variant],
          };
        }
      });

      return Object.values(packageMap);
    };

    setResults(data ? mergeResults(data) : []);
  }, [loading, error, data]);

  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  return (
    <Flex flex="1" w="100%" flexDir={isSmall ? 'column' : 'row'}>
      <Box
        p={8}
        borderRight={isSmall ? 'none' : '1px solid'}
        borderColor="gray.700"
        flexShrink={0}
        flexGrow={isSmall ? 0 : 1}
        overflowY="auto"
        maxWidth={isSmall ? '100%' : '300px'}
      >
        <InputGroup borderColor="gray.600">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.500" />
          </InputLeftElement>
          <Input onChange={handleSearch} mb={6} />
        </InputGroup>
        {/*
        <Text fontSize="sm" color="gray.500">
          {!totalLoading &&
            'Showing pages ' +
              page +
              ' of ' +
              totalPages +
              ' (' +
              totalPackages?.totalPackages?.length +
              ' results)'}
        </Text>
          */}
      </Box>
      {loading ? (
        <Flex justifyContent="center" alignItems="center" flex={1}>
          <Spinner />
        </Flex>
      ) : (
        <Box px={4} py={isSmall ? 4 : 8} flex={1} overflowY="auto">
          <Container ml={0} maxWidth="container.xl">
            {results.map((pkg: Package) => (
              <Box mb="8">
                <PackageCard pkg={pkg} key={pkg.name} />
              </Box>
            ))}
            {/*
            <Flex justifyContent="space-between">
              <Button
                size="sm"
                colorScheme="teal"
                onClick={() => setPage(page - 1)}
                isDisabled={page === 1}
              >
                Previous
              </Button>
              <Button
                size="sm"
                colorScheme="teal"
                onClick={() => setPage(page + 1)}
                isDisabled={page >= totalPages}
              >
                Next
              </Button>
            </Flex>
            */}
          </Container>
        </Box>
      )}
    </Flex>
  );
};
