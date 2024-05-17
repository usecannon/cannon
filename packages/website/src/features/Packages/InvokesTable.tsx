// @ts-nocheck
import * as React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  chakra,
  Text,
  Link,
} from '@chakra-ui/react';
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
import { ChainBuilderContext } from '@usecannon/builder';
import chains from '@/helpers/chains';

/*
  * Function Calls

  * Step
  * Transaction Hash {linked to etherscan}
  * Target Address {linked to etherscan}
  * From Address {linked to etherscan}
  * Value?
  * Timestamp? Block Number?
  * Link to Code ?
  * Link to Interact ?
*/

export const InvokesTable: React.FC<{
  invokeState: ChainBuilderContext['txns'];
  chainId: number;
}> = ({ invokeState, chainId }) => {
  type InvokeRow = {
    name: string;
    value: string;
  };

  const data = React.useMemo(() => {
    return Object.entries(invokeState).map(
      ([key, value]): InvokeRow => ({
        name: key?.toString(),
        value: value.hash,
      })
    );
  }, [invokeState]);

  const columnHelper = createColumnHelper<InvokeRow>();

  const columns = [
    columnHelper.accessor('name', {
      cell: (info: any) => info.getValue(),
      header: 'Operation',
    }),
    columnHelper.accessor('value', {
      cell: (info: any) => info.getValue(),
      header: 'Transaction Hash',
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

  const etherscanUrl = (
    Object.values(chains).find((chain) => chain.id === chainId) as any
  )?.blockExplorers?.default?.url;

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
                  {header.column.columnDef.accessorKey !== 'arrow' && (
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
                  )}
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
              // see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
              const meta: any = cell.column.columnDef.meta;
              return (
                <Td
                  key={cell.id}
                  isNumeric={meta?.isNumeric}
                  borderColor="gray.600"
                  borderBottom={
                    table.getRowModel().rows.length == rowInd + 1
                      ? 'none'
                      : undefined
                  }
                  whiteSpace="nowrap"
                >
                  {(() => {
                    switch (cell.column.columnDef.accessorKey) {
                      case 'name': {
                        return (
                          <Text fontFamily="mono">
                            [{cell.row.original.name}]
                          </Text>
                        );
                      }
                      case 'value': {
                        return etherscanUrl ? (
                          <Link
                            isExternal
                            href={
                              etherscanUrl + '/tx/' + cell.row.original.value
                            }
                            fontFamily="mono"
                            borderBottom="1px dotted"
                            borderBottomColor="gray.300"
                            textDecoration="none"
                            _hover={{ textDecoration: 'none' }}
                          >
                            {cell.row.original.value}
                          </Link>
                        ) : (
                          <Text fontFamily="mono">
                            {cell.row.original.value}
                          </Text>
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
};
