// @ts-nocheck
import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { StarIcon } from 'lucide-react';
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import { createColumnHelper } from '@tanstack/react-table';
import { ChainBuilderContext } from '@usecannon/builder';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import UnavailableTransaction from '@/features/Packages/UnavailableTransaction';

type ContractRow = {
  highlight: boolean;
  name: string;
  address: string;
  deployTxnHash: string;
};

/*
  * Smart Contract Deployments

  * Operation
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
  const { getExplorerUrl } = useCannonChains();

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
      header: 'Operation',
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

  return (
    <div className="w-full rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-border">
              {headerGroup.headers.map((header) => {
                const meta: any = header.column.columnDef.meta;
                return (
                  <TableHead
                    key={header.id}
                    className={meta?.isNumeric ? 'text-right' : ''}
                  >
                    <Button
                      variant="ghost"
                      onClick={header.column.getToggleSortingHandler()}
                      className="h-8 px-2 -ml-2"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      <CaretSortIcon
                        className={`${
                          header.column.columnDef.accessorKey === 'highlight'
                            ? 'h-4 w-4'
                            : 'ml-2 h-4 w-4'
                        }`}
                      />
                    </Button>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="border-border hover:bg-muted/50">
              {row.getVisibleCells().map((cell) => {
                const meta: any = cell.column.columnDef.meta;
                return (
                  <TableCell
                    key={cell.id}
                    className={`
                      relative overflow-hidden whitespace-nowrap
                      ${meta?.isNumeric ? 'text-right' : ''}
                    `}
                  >
                    {(() => {
                      switch (cell.column.columnDef.accessorKey) {
                        case 'highlight': {
                          return cell.row.original.highlight ? (
                            <StarIcon className="h-4 w-4 text-muted-foreground" />
                          ) : null;
                        }
                        case 'step': {
                          return (
                            <code className="text-xs">
                              [{cell.row.original.step}]
                            </code>
                          );
                        }
                        case 'name': {
                          return !cell.row.original.name.length ? (
                            <span className="text-muted-foreground italic">
                              Unavailable
                            </span>
                          ) : (
                            <span className="font-bold">
                              {cell.row.original.name}
                            </span>
                          );
                        }
                        case 'address':
                        case 'deployTxnHash': {
                          const value =
                            cell.row.original[
                              cell.column.columnDef.accessorKey
                            ];
                          if (!value) {
                            return <UnavailableTransaction />;
                          }
                          const explorerUrl = getExplorerUrl(chainId, value);
                          return explorerUrl ? (
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono border-b border-dotted border-muted-foreground hover:border-solid"
                            >
                              {value}
                            </a>
                          ) : (
                            <code className="text-xs">{value}</code>
                          );
                        }
                        default: {
                          return flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          );
                        }
                      }
                    })()}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
