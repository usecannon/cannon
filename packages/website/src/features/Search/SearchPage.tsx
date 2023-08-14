'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Container,
  Flex,
  Grid,
  GridItem,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Text,
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
  const pageSize = 5;
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

  return (
    <Container maxW="container.lg">
      <Grid templateColumns="repeat(12, 1fr)" gap={6}>
        <GridItem colSpan={3}>
          <Heading as="h3" size="sm" mb={2}>
            Search
          </Heading>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input onChange={handleSearch} mb={6} />
          </InputGroup>
          <Text>
            {!totalLoading &&
              'Showing ' +
                page +
                '-' +
                totalPages +
                ' of ' +
                totalPackages?.totalPackages?.length +
                ' results'}
          </Text>
        </GridItem>
        {loading ? (
          <GridItem colSpan={9}>
            <Flex justifyContent="center" py={12}>
              <Spinner />
            </Flex>
          </GridItem>
        ) : (
          <GridItem colSpan={9}>
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
          </GridItem>
        )}
      </Grid>
    </Container>
  );
};
