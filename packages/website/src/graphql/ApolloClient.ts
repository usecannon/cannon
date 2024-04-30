import { ApolloClient, InMemoryCache } from '@apollo/client';

const apolloClient = new ApolloClient({
  uri: 'https://gateway-arbitrum.network.thegraph.com/api/ffe77687bd873a8d0426b3aeba4b8dc5/subgraphs/id/4VKdYs7BmLDxZHffkusKRknCmPkgw7Aa4Msx4kP2sETN',
  cache: new InMemoryCache(),
});

export const apolloClientOptimism = new ApolloClient({
  uri: 'https://gateway-arbitrum.network.thegraph.com/api/ffe77687bd873a8d0426b3aeba4b8dc5/subgraphs/id/JE9WYVo5XUo4FF67wURm8GUD1bxmiBBrzG1GJVTb7zQ8',
  cache: new InMemoryCache(),
});

export default apolloClient;
