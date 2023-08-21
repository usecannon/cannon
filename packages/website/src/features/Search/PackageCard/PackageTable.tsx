import { Package, Variant } from '@/types/graphql/graphql';
import { FC } from 'react';
import 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';
import { DataTable } from './DataTable';
import { createColumnHelper } from '@tanstack/react-table';

const PackageTable: FC<{
  pkg: Package;
}> = ({ pkg }) => {
  type VariantRow = {
    chain: number;
    tag: string;
    preset: string;
    deploymentData: string;
    published: number;
    arrow?: string;
  };

  const data: VariantRow[] = pkg.variants.map((v: Variant) => {
    return {
      tag: v.tag.name,
      chain: v.chain_id,
      preset: v.preset,
      deploymentData: v.deploy_url,
      published: v.last_updated,
    };
  });

  const columnHelper = createColumnHelper<VariantRow>();

  const columns = [
    columnHelper.accessor('tag', {
      cell: (info) => info.getValue(),
      header: 'Tag',
    }),
    columnHelper.accessor('chain', {
      cell: (info) => info.getValue(),
      header: 'Chain',
    }),
    columnHelper.accessor('preset', {
      cell: (info) => info.getValue(),
      header: 'Preset',
    }),
    columnHelper.accessor('deploymentData', {
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

  return <DataTable packageName={pkg.name} columns={columns} data={data} />;
};

export default PackageTable;
