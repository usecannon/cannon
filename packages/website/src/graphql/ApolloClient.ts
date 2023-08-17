import { ApolloClient, InMemoryCache } from '@apollo/client';

const apolloClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/noahlitvin/cannon-registry-mainnet', // Replace with your GraphQL API endpoint
  cache: new InMemoryCache(),
});

export default apolloClient;
