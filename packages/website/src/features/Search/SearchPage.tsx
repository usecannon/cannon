'use client';

import { useEffect, useState } from 'react';
import { Grid, GridItem, Input } from '@chakra-ui/react';
import { useQuery } from '@apollo/client';
import { GET_PACKAGES, TOTAL_PACKAGES } from '@/graphql/queries';
import {
  GetPackagesQuery,
  GetPackagesQueryVariables,
  GetTotalPackagesQuery,
  GetTotalPackagesQueryVariables,
} from '@/types/graphql/graphql';
import { PackagePreview } from '@/features/Search/PackagePreview';

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
  const { data: totalPackages } = useQuery<
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
    if (loading) {
      console.log('loading:', loading);
    }
    if (data) {
      console.log('data:', JSON.stringify(data.packages.length));
    }
    if (error) {
      console.log('error:', error);
    }
    setPackages(data?.packages || []);
  }, [loading, error, data]);

  useEffect(() => {
    console.log('totalPackages:', totalPackages?.totalPackages?.length);
    setTotalPages(
      Math.ceil((totalPackages?.totalPackages?.length || 0) / pageSize)
    );
  }, [totalPackages]);

  return (
    <Grid gap={6}>
      <GridItem>
        <div>
          Search
          <Input onChange={handleSearch} />
        </div>
        <div>
          Showing page {page} of {totalPages}
        </div>
        <div>
          <button onClick={() => setPage(page - 1)} disabled={page === 1}>
            Previous
          </button>
        </div>
        <div>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </GridItem>
      <GridItem>
        <PackagePreview packages={packages} />
      </GridItem>
    </Grid>
  );
};
