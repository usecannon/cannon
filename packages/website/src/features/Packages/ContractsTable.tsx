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
import { ArrowDownUp } from 'lucide-react';
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
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import UnavailableTransaction from '@/features/Packages/UnavailableTransaction';
import { formatTransactionHash } from '@/helpers/formatters';
import { ContractRow, ContractOptionMap } from '@/lib/interact';

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
  contractState: ContractOptionMap;
  chainId: number;
}> = ({ contractState, chainId }) => {
  const { getExplorerUrl } = useCannonChains();

  const data = React.useMemo(() => {
    return Object.entries(contractState).map(
      ([, value]): ContractRow => ({
        highlight: !!value.highlight,
        name: value.contractName || '',
        step: value.step,
        address: value.contractAddress,
        deployTxnHash: value.deployTxnHash,
        deployType: value.deployType,
        path: value.path,
        moduleName: value.moduleName || '',
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
    columnHelper.accessor('step', {
      cell: (info: any) => info.getValue(),
      header: 'Operation',
    }),
    columnHelper.accessor('deployType', {
      cell: (info: any) => info.getValue(),
      header: 'Deployment Type',
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
                      <ArrowDownUp
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
                          return (
                            <a
                              href={cell.row.original.path}
                              className="font-mono border-b border-dotted border-muted-foreground hover:border-solid"
                            >
                              {`${cell.row.original.moduleName}.${cell.row.original.name}`}
                            </a>
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
                              {formatTransactionHash(value)}
                            </a>
                          ) : (
                            <code className="text-xs">{value}</code>
                          );
                        }
                        case 'deployType':
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
