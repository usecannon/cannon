import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'https://api.thegraph.com/subgraphs/name/noahlitvin/cannon-registry-mainnet',
  documents: 'src/graphql/queries.ts',
  generates: {
    'src/types/graphql/': {
      preset: 'client',
      plugins: [],
    },
    'graphql/schema.graphql': {
      plugins: ['schema-ast'],
    },
  },
};

export default config;
