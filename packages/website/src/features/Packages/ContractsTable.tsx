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
  StarIcon,
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
  chainId: number;
}> = ({ contractState, chainId }) => {
  type ContractRow = {
    highlight: boolean;
    name: string;
    address: string;
    deployTxnHash: string;
  };

  const data = React.useMemo(() => {
    return Object.entries(contractState).map(
      ([key, value]): ContractRow => ({
        highlight: !!value.highlight,
        name: key?.toString(),
        step: value.deployedOn.toString(),
        address: value.address,
        deployTxnHash: value.deployTxnHash,
      })
    );
  }, [contractState]);

  const hasHighedlighted = data.some((row) => row.highlight);

  const columnHelper = createColumnHelper<ContractRow>();

  const columns = [
    ...(hasHighedlighted
      ? [
          columnHelper.accessor('highlight', {
            cell: (info: any) => info.getValue(),
            header: '',
          }),
        ]
      : []),
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
      header: 'Transaction Hash',
    }),
  ];

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'highlight', desc: true },
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
        {table.getRowModel().rows.map((row, rowInd) => {
          return (
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
                        case 'highlight': {
                          return cell.row.original.highlight ? (
                            <StarIcon color="gray.300" />
                          ) : (
                            ''
                          );
                        }
                        case 'step': {
                          return (
                            <Text fontFamily="mono">
                              [{cell.row.original.step}]
                            </Text>
                          );
                        }
                        case 'name': {
                          return (
                            <Text fontWeight="bold">
                              {cell.row.original.name}
                            </Text>
                          );
                        }
                        case 'address': {
                          return etherscanUrl ? (
                            <Link
                              isExternal
                              href={
                                etherscanUrl +
                                '/address/' +
                                cell.row.original.address
                              }
                              fontFamily="mono"
                              borderBottom="1px dotted"
                              borderBottomColor="gray.300"
                              textDecoration="none"
                              _hover={{ textDecoration: 'none' }}
                            >
                              {cell.row.original.address}
                            </Link>
                          ) : (
                            <Text fontFamily="mono">
                              {cell.row.original.address}
                            </Text>
                          );
                        }
                        case 'deployTxnHash': {
                          return etherscanUrl ? (
                            <Link
                              isExternal
                              href={
                                etherscanUrl +
                                '/tx/' +
                                cell.row.original.deployTxnHash
                              }
                              fontFamily="mono"
                              borderBottom="1px dotted"
                              borderBottomColor="gray.300"
                              textDecoration="none"
                              _hover={{ textDecoration: 'none' }}
                            >
                              {cell.row.original.deployTxnHash}
                            </Link>
                          ) : (
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
          );
        })}
      </Tbody>
    </Table>
  );
};
