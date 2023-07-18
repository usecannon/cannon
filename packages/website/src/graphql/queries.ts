import gql from 'graphql-tag';

export const GET_PACKAGES = gql`
  query getPackages($query: String!, $skip: Int!, $first: Int!) {
    packages: packages(
      first: $first
      skip: $skip
      orderDirection: desc
      orderBy: last_updated
      where: { name_contains: $query }
    ) {
      name
      last_updated
      last_publisher
      tags(orderDirection: desc, orderBy: last_updated) {
        name
        last_updated
        last_publisher
        variants(orderDirection: desc, orderBy: last_updated) {
          name
          last_updated
          last_publisher
          preset
          chain_id
        }
      }
    }
  }
`;

export const TOTAL_PACKAGES = gql`
  query getTotalPackages($query: String!) {
    totalPackages: packages(where: { name_contains: $query }) {
      id
    }
  }
`;

export default GET_PACKAGES;
