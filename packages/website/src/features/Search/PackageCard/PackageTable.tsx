import { FC } from 'react';
import 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';
import { DataTable } from './DataTable';
import { createColumnHelper } from '@tanstack/react-table';
import chains from '@/helpers/chains';
import { Box } from '@chakra-ui/react';

const PackageTable: FC<{
  pkgs: any;
  latestOnly: boolean;
}> = ({ pkgs, latestOnly }) => {
  let data = pkgs.map((v: any) => {
    return {
      version: v.version,
      chain: v.chainId,
      preset: v.preset,
      deployUrl: v.deployUrl,
      metaUrl: v.metaUrl,
      published: v.timestamp,
    };
  });

  const columnHelper = createColumnHelper();

  const columns = [
    columnHelper.accessor('version', {
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
    data = data.filter((row: any) => row.version === 'latest');

    data = data.filter((row: any) => {
      const matchingChain = Object.values(chains).find((chain) => {
        return chain.id === row.chain;
      });
      return matchingChain && !(matchingChain as any).testnet;
    });
  }

  return data.length ? (
    <Box borderTop="1px solid" borderColor="gray.600">
      <DataTable packageName={pkgs[0].name} columns={columns} data={data} />
    </Box>
  ) : (
    <></>
  );
};

export default PackageTable;
