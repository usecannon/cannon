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

/*
  * Smart Contract Deployments

  * Step
  * Address {linked to etherscan}
  * Transaction Hash {linked to etherscan}
  * Used CREATE2?
  * Deployer Address
  * Timestamp? Block Number?
  * Link to Code ?
  * Link to Interact ?
  * Show whether its highlighted
*/
export const ContractsTable: React.FC<{
  contractState: ChainBuilderContext['contracts'];
}> = ({ contractState }) => {
  type ContractRow = {
    name: string;
    address: string;
    deployTxnHash: string;
  };

  const data: ContractRow[] = Object.entries(contractState).map(
    ([key, value]) => {
      return {
        name: key?.toString(),
        step: value.deployedOn.toString(),
        address: value.address as string,
        deployTxnHash: value.deployTxnHash as string,
      };
    }
  );

  const columnHelper = createColumnHelper<ContractRow>();

  const columns = [
    columnHelper.accessor('step', {
      cell: (info: any) => info.getValue(),
      header: 'Step',
    }),
    columnHelper.accessor('name', {
      cell: (info: any) => info.getValue(),
      header: 'Contract Name',
    }),
    columnHelper.accessor('address', {
      cell: (info: any) => info.getValue(),
      header: 'Contract Address',
    }),
    columnHelper.accessor('deployTxnHash', {
      cell: (info: any) => info.getValue(),
      header: 'Deploy Transaction Hash',
    }),
  ];

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'step', desc: false },
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
                      case 'step': {
                        return (
                          <Text fontFamily="mono">
                            [{cell.row.original.step}]
                          </Text>
                        );
                      }
                      case 'address': {
                        return (
                          <Text fontFamily="mono">
                            {cell.row.original.address}
                          </Text>
                        );
                      }
                      case 'deployTxnHash': {
                        return (
                          <Text fontFamily="mono">
                            {cell.row.original.deployTxnHash}
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
