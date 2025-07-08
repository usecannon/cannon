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
import { ArrowRight, ArrowDownUp, CircleHelp } from 'lucide-react';

import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Chain from './Chain';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ClipboardButton from '@/components/ClipboardButton';

export type DataTableProps<Data extends object> = {
  data: Data[];
  columns: any[];
  packageName?: string;
};

const formatIPFS = (input: string, partLength: number): string => {
  if (!input) return '';
  const prefix = 'ipfs://';
  const hash = input.substring(prefix.length);

  if (hash.length <= partLength * 2) {
    return input;
  }

  const startPart = hash.substring(0, partLength);
  const endPart = hash.substring(hash.length - partLength);

  return `${prefix}${startPart}...${endPart}`;
};

const getCellContent = ({ cell }: { cell: any }) => {
  const timeAgo = formatDistanceToNow(
    new Date(cell.row.original.published * 1000),
    {
      addSuffix: true,
    }
  );

  const tooltipTime = format(
    new Date(cell.row.original.published * 1000),
    'PPPppp'
  );

  switch (cell.column.columnDef.accessorKey) {
    case 'chain': {
      return <Chain id={cell.row.original.chain} />;
    }
    case 'deployUrl': {
      return (
        <div className="flex items-center">
          <code className="text-xs translate-y-[1px]">
            {formatIPFS(cell.row.original.deployUrl, 10)}
          </code>
          <ClipboardButton
            text={cell.row.original.deployUrl}
            className="ml-3 z-10"
            size="sm"
          />
        </div>
      );
    }
    case 'published': {
      return (
        <Tooltip>
          <TooltipTrigger>{timeAgo}</TooltipTrigger>
          <TooltipContent>{tooltipTime}</TooltipContent>
        </Tooltip>
      );
    }
    case 'arrow': {
      return <ArrowRight className="h-3 w-3" />;
    }
    default: {
      return <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>;
    }
  }
};

export function DataTable<Data extends object>({
  data,
  columns,
  packageName,
}: DataTableProps<Data>) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'published', desc: true },
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
    <div className="w-full">
      <div className="border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border">
                {headerGroup.headers.map((header) => {
                  const meta: any = header.column.columnDef.meta;
                  return (
                    <TableHead
                      key={header.id}
                      className={`
                        ${meta?.isNumeric ? 'text-right' : ''}
                        ${
                          header.column.columnDef.accessorKey === 'version'
                            ? 'pl-3'
                            : ''
                        }
                      `}
                    >
                      {header.column.columnDef.accessorKey !== 'arrow' ? (
                        <Button
                          variant="ghost"
                          onClick={header.column.getToggleSortingHandler()}
                          className="h-8 px-2 -ml-2 inline-flex items-center justify-center"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <ArrowDownUp className="ml-2 h-4 w-4" />
                          {header.column.columnDef.accessorKey == 'preset' && (
                            <Tooltip>
                              <TooltipTrigger>
                                <CircleHelp className="inline-block whitespace-nowrap align-sub" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm text-center">
                                Presets are useful for distinguishing multiple
                                deployments of the same protocol on the same
                                chain.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </Button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const variant = `${row.original.chain}-${row.original.preset}`;
                return (
                  <TableRow
                    key={row.id}
                    className="border-border hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta: any = cell.column.columnDef.meta;
                      return (
                        <TableCell
                          key={cell.id}
                          className={`
                            relative overflow-hidden whitespace-nowrap
                            ${meta?.isNumeric ? 'text-right' : ''}
                            ${
                              cell.column.columnDef.accessorKey === 'version'
                                ? 'pl-3'
                                : ''
                            }
                          `}
                        >
                          <Link
                            href={`/packages/${
                              packageName ?? row.original.name
                            }/${row.original.version}/${variant}`}
                            className="absolute inset-0 z-10 block"
                          />
                          <div className="relative z-1">
                            {getCellContent({ cell })}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            ) : (
              <TableRow className="border-border">
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
