'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Flex,
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Text,
  useBreakpointValue,
  Container,
} from '@chakra-ui/react';
import { useQuery } from '@apollo/client';
import { GET_PACKAGES, TOTAL_PACKAGES } from '@/graphql/queries';
import {
  GetPackagesQuery,
  GetPackagesQueryVariables,
  GetTotalPackagesQuery,
  GetTotalPackagesQueryVariables,
} from '@/types/graphql/graphql';
import { SearchIcon } from '@chakra-ui/icons';
import { PackageCard } from './PackageCard/PackageCard';

export const SearchPage = () => {
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pageSize = 20;
  const [searchTerm, setSearchTerm] = useState<string>('');
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

  const handleSearch = (e: any) => {
    setSearchTerm(e.target.value);
  };

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
      </Box>
      {loading ? (
        <Flex justifyContent="center" alignItems="center" flex={1}>
          <Spinner />
        </Flex>
      ) : (
        <Box p={isSmall ? 4 : 8} flex={1} overflowY="auto">
          <Container ml={0} maxWidth="container.xl">
            {packages.map((pkg) => (
              <PackageCard pkg={pkg} key={pkg.name} />
            ))}
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
          </Container>
        </Box>
      )}
    </Flex>
  );
};
