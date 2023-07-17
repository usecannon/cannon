'use client';

import { Container } from '@chakra-ui/react';
import { SearchPackages } from '@/features/Search/SearchPackages';
import apolloClient from '@/graphql/ApolloClient';
import { ApolloProvider } from '@apollo/client';

export const SearchPage = () => {
  return (
    <Container maxW="container.lg">
      <ApolloProvider client={apolloClient}>
        <SearchPackages />
      </ApolloProvider>
    </Container>
  );
};
