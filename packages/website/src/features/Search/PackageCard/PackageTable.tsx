import { GetFilteredPackagesAndVariantsQuery } from '@/types/graphql/graphql';
import { FC } from 'react';
import { Box } from '@chakra-ui/react';
import 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';
import { DataTable } from './DataTable';
import { createColumnHelper } from '@tanstack/react-table';

type Package = GetFilteredPackagesAndVariantsQuery['packages'][0];
type Variant = GetFilteredPackagesAndVariantsQuery['filteredVariants'][0];

const PackageTable: FC<{
  pkg: Package;
}> = ({ pkg }) => {
  type VariantRow = {
    chain: number;
    tag: string;
    preset: string;
    published: number;
  };

  const data: VariantRow[] = pkg.variants.map((v: Variant) => {
    return {
      tag: v.tag.name,
      chain: v.chain_id,
      preset: v.preset,
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
    columnHelper.accessor('published', {
      cell: (info) => info.getValue(),
      header: 'Published',
    }),
  ];

  return (
    <Box verticalAlign="middle">
      <DataTable columns={columns} data={data} />
    </Box>
  );
};

export default PackageTable;
