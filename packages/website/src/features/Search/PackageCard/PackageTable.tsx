import { FC } from 'react';
import 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';
import { DataTable } from './DataTable';
import { createColumnHelper } from '@tanstack/react-table';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { ApiDocument } from '@usecannon/api/dist/src/types';

const PackageTable: FC<{
  pkgs: ApiDocument[];
  latestOnly: boolean;
  searchTerm?: string;
}> = ({ pkgs, latestOnly, searchTerm }) => {
  const { getChainById } = useCannonChains();
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

  if (searchTerm) {
    data = data.filter((row: any) => {
      const matchingChain = getChainById(row.chain);
      return (
        row.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.preset.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.deployUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
        matchingChain?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }

  if (latestOnly) {
    data = data.filter(
      (row: any) => row.version === 'latest' && row.chain !== 13370
    );

    data = data.filter((row: any) => {
      const matchingChain = getChainById(row.chain);
      return matchingChain && !(matchingChain as any).testnet;
    });
  }

  return data.length ? (
    <div className="border-t border-border">
      <DataTable packageName={pkgs[0].name} columns={columns} data={data} />
    </div>
  ) : null;
};

export default PackageTable;
