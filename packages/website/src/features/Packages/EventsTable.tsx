// @ts-nocheck
import * as React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td, chakra } from '@chakra-ui/react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowUpDownIcon,
} from '@chakra-ui/icons';
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';

type NestedObject = { [key: string]: any };

export const EventsTable: React.FC<{
  extrasState: NestedObject;
}> = ({ extrasState }) => {
  type EventRow = {
    name: string;
    value: string;
  };

  const data = React.useMemo(() => {
    return Object.entries(extrasState).map(
      ([key, value]): EventRow => ({
        name: key,
        value: value,
      })
    );
  }, [extrasState]);

  const columnHelper = createColumnHelper<EventRow>();

  const columns = [
    columnHelper.accessor('name', {
      cell: (info: any) => info.getValue(),
      header: 'Name',
    }),
    columnHelper.accessor('value', {
      cell: (info: any) => info.getValue(),
      header: 'Value',
    }),
  ];

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'name', desc: false },
  ]);
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
              return (
                <Th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  color="gray.200"
                  borderColor="gray.600"
                  textTransform="none"
                  letterSpacing="normal"
                  fontSize="sm"
                  fontWeight={500}
                  py={2}
                  cursor="pointer"
                  whiteSpace="nowrap"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                  {
                    <chakra.span display="inline-block" h="12px" w="12px">
                      {header.column.getIsSorted() ? (
                        header.column.getIsSorted() === 'desc' ? (
                          <ChevronDownIcon
                            boxSize={4}
                            aria-label="sorted descending"
                            transform="translateY(2.5px)"
                          />
                        ) : (
                          <ChevronUpIcon
                            boxSize={4}
                            aria-label="sorted ascending"
                            transform="translateY(-2.5px)"
                          />
                        )
                      ) : (
                        <ArrowUpDownIcon
                          boxSize={2.5}
                          transform="translateX(2.5px)"
                        />
                      )}
                    </chakra.span>
                  }
                </Th>
              );
            })}
          </Tr>
        ))}
      </Thead>
      <Tbody>
        {table.getRowModel().rows.map((row, rowInd) => (
          <Tr key={row.id}>
            {row.getVisibleCells().map((cell) => {
              return (
                <Td
                  key={cell.id}
                  borderColor="gray.600"
                  borderBottom={
                    table.getRowModel().rows.length == rowInd + 1
                      ? 'none'
                      : undefined
                  }
                  whiteSpace="nowrap"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Td>
              );
            })}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};
