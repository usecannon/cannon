import { useEffect, useState } from 'react';
import { Grid, GridItem, Input } from '@chakra-ui/react';
import { useQuery } from '@apollo/client';
import { GET_PACKAGES } from '@/graphql/queries';
import { Package } from '@/types/graphql/graphql';

export const SearchPackages = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { loading, error, data } = useQuery(GET_PACKAGES, {
    variables: { query: searchTerm, skip: 0, first: 10 },
  });

  const [packages, setPackages] = useState<Package[]>([]);

  const handleSearch = (e: any) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    console.log('Definition:', GET_PACKAGES.definitions);
  }, []);

  useEffect(() => {
    if (loading) {
      console.log('loading:', loading);
    }
    if (data) {
      console.log('data:', JSON.stringify(data));
    }
    if (error) {
      console.log('error:', error);
    }
    setPackages(data?.packages || []);
  }, [loading, error, data]);

  return (
    <Grid gap={6}>
      <GridItem>
        <div>
          Search
          <Input onChange={handleSearch} />
        </div>
      </GridItem>
      <GridItem></GridItem>
    </Grid>
  );
};
