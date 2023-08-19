import * as React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td, chakra } from '@chakra-ui/react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowUpDownIcon,
  ArrowRightIcon,
} from '@chakra-ui/icons';
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  ColumnDef,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import NextLink from 'next/link';

export type DataTableProps<Data extends object> = {
  data: Data[];
  columns: ColumnDef<Data, any>[];
  packageName: string;
};

export function DataTable<Data extends object>({
  data,
  columns,
  packageName,
}: DataTableProps<Data>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <Table size="sm">
      <Thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <Tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              // see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
              const meta: any = header.column.columnDef.meta;
              return (
                <Th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  isNumeric={meta?.isNumeric}
                  color="gray.200"
                  borderColor="gray.600"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}

                  <chakra.span pl="4">
                    {header.column.getIsSorted() ? (
                      header.column.getIsSorted() === 'desc' ? (
                        <ChevronDownIcon aria-label="sorted descending" />
                      ) : (
                        <ChevronUpIcon aria-label="sorted ascending" />
                      )
                    ) : (
                      <ArrowUpDownIcon />
                    )}
                  </chakra.span>
                </Th>
              );
            })}
          </Tr>
        ))}
      </Thead>
      <Tbody>
        {table.getRowModel().rows.map((row) => (
          <Tr key={row.id}>
            {row.getVisibleCells().map((cell) => {
              // see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
              const meta: any = cell.column.columnDef.meta;
              return (
                <Td
                  key={cell.id}
                  isNumeric={meta?.isNumeric}
                  borderColor="gray.600"
                >
                  {(() => {
                    switch (cell.column.columnDef.accessorKey) {
                      case 'arrow': {
                        const variant = `${cell.row.original.chain}-${cell.row.original.preset}`;
                        return (
                          <NextLink
                            href={`./packages/${packageName}/${cell.row.original.tag}/${variant}`}
                          >
                            <ArrowRightIcon />
                          </NextLink>
                        );
                      }
                      default: {
                        return (
                          <>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </>
                        );
                      }
                    }
                  })()}
                </Td>
              );
            })}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
