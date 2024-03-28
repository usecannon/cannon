import { ApolloClient, InMemoryCache } from '@apollo/client';

const apolloClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/noahlitvin/cannon-registry-mainnet',
  cache: new InMemoryCache(),
});

export const apolloClientOptimism = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/noahlitvin/cannon-registry-optimism',
  cache: new InMemoryCache(),
});

export default apolloClient;
