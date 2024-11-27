'use client';

import { CustomSpinner } from '@/components/CustomSpinner';
import { useQuery } from '@tanstack/react-query';
import { getPackages } from '@/helpers/api';
import { DataTable } from './PackageCard/DataTable';
import { createColumnHelper } from '@tanstack/react-table';

export const AllPackages = () => {
  const packagesQuery = useQuery({
    queryKey: ['packages', '', [], 'package'],
    queryFn: getPackages,
  });

  const columnHelper = createColumnHelper();
  const columns = [
    columnHelper.accessor('name', {
      cell: (info) => info.getValue(),
      header: 'Name',
    }),
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
      sortDescFirst: true,
    }),
  ];

  // Transform the data for the table
  const tableData =
    packagesQuery?.data?.data?.map((pkg: any) => ({
      name: pkg.name,
      version: pkg.version,
      chain: pkg.chainId,
      preset: pkg.preset,
      deployUrl: pkg.deployUrl,
      published: pkg.timestamp,
    })) || [];

  return (
    <div className="flex flex-1 w-full">
      <main className="flex-1 w-full md:w-[calc(100%-320px)]">
        <div className="container max-w-100 mx-auto px-4 md:px-6 lg:px-8">
          {packagesQuery.isPending ? (
            <div className="flex justify-center items-center py-8">
              <CustomSpinner />
            </div>
          ) : tableData.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <p className="text-gray-400">No results</p>
            </div>
          ) : (
            <div className="py-8">
              <div className="border border-border rounded-lg">
                <DataTable columns={columns} data={tableData} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
