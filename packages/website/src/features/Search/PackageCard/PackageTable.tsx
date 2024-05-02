import { FC } from 'react';
import 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';
import { DataTable } from './DataTable';
import { createColumnHelper } from '@tanstack/react-table';
import chains from '@/helpers/chains';
import { Box } from '@chakra-ui/react';

const PackageTable: FC<{
  pkg: any;
  latestOnly: boolean;
}> = ({ pkg, latestOnly }) => {
  let data = pkg.tags.results.map((v: any) => {
    return {
      chain: v.chain_id,
      preset: v.preset,
      deployUrl: v.deploy_url,
      metaUrl: v.meta_url,
      published: v.timestamp,
    };
  });

  const columnHelper = createColumnHelper();

  const columns = [
    columnHelper.accessor('tag', {
      cell: (info) => info.getValue(),
      header: 'Version',
    }),
    columnHelper.accessor('preset', {
      cell: (info) => info.getValue(),
      header: 'Preset',
    }),
    columnHelper.accessor('chain', {
      cell: (info) => info.getValue(),
      header: 'Chain',
    }),
    columnHelper.accessor('deployUrl', {
      cell: (info) => info.getValue(),
      header: 'Deployment Data',
    }),
    columnHelper.accessor('published', {
      cell: (info) => info.getValue(),
      header: 'Published',
    }),
    columnHelper.accessor('arrow', {
      cell: '',
      header: '',
    }),
  ];

  if (latestOnly) {
    data = data.filter((row: any) => row.tag === 'latest');

    data = data.filter((row: any) => {
      const matchingChain = Object.values(chains).find((chain) => {
        return chain.id === row.chain;
      });
      return matchingChain && !(matchingChain as any).testnet;
    });
  }

  return data.length ? (
    <Box borderTop="1px solid" borderColor="gray.600">
      <DataTable packageName={pkg.name} columns={columns} data={data} />
    </Box>
  ) : (
    <></>
  );
};

export default PackageTable;
