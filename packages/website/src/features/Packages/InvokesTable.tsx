// @ts-nocheck
import * as React from 'react';
import * as viem from 'viem';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { ChainBuilderContext } from '@usecannon/builder';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import UnavailableTransaction from '@/features/Packages/UnavailableTransaction';

type InvokeRow = {
  name: string;
  value: string;
};

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
  const { getExplorerUrl } = useCannonChains();

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
                      <CaretSortIcon className="ml-2 h-4 w-4" />
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
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className="relative overflow-hidden whitespace-nowrap"
                >
                  {(() => {
                    switch (cell.column.columnDef.accessorKey) {
                      case 'name': {
                        return (
                          <code className="text-xs">
                            [{cell.row.original.name}]
                          </code>
                        );
                      }
                      case 'value': {
                        if (!cell.row.original.value) {
                          return <UnavailableTransaction />;
                        }
                        const explorerUrl = getExplorerUrl(
                          chainId,
                          cell.row.original.value as viem.Hash
                        );
                        return explorerUrl ? (
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono border-b border-dotted border-muted-foreground hover:border-solid"
                          >
                            {cell.row.original.value}
                          </a>
                        ) : (
                          <code className="text-xs">
                            {cell.row.original.value}
                          </code>
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
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
