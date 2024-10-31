// @ts-nocheck
import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CaretDownIcon,
  CaretUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  QuestionMarkCircledIcon,
} from "@radix-ui/react-icons";
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Chain from './Chain';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export type DataTableProps<Data extends object> = {
  data: Data[];
  columns: any[];
  packageName: string;
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
        <code className="text-xs translate-y-[1px]">
          {formatIPFS(cell.row.original.deployUrl, 10)}
        </code>
      );
    }
    case 'published': {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>{timeAgo}</TooltipTrigger>
            <TooltipContent>{tooltipTime}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    case 'arrow': {
      return <ArrowRightIcon className="h-3 w-3" />;
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
    <Table className="[&_tr:last-child_td]:border-0">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const meta: any = header.column.columnDef.meta;
              return (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className={`
                    text-gray-200 border-gray-600 normal-case tracking-normal text-sm font-medium py-2 
                    cursor-pointer whitespace-nowrap
                    ${meta?.isNumeric ? 'text-right' : ''}
                  `}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.columnDef.accessorKey !== 'arrow' && (
                    <span className="inline-block h-3 w-3">
                      {header.column.getIsSorted() ? (
                        header.column.getIsSorted() === 'desc' ? (
                          <CaretDownIcon className="h-4 w-4 translate-y-[2.5px]" aria-label="sorted descending" />
                        ) : (
                          <CaretUpIcon className="h-4 w-4 -translate-y-[2.5px]" aria-label="sorted ascending" />
                        )
                      ) : (
                        <ArrowDownIcon className="h-2.5 w-2.5 translate-x-[2.5px] rotate-180" />
                      )}
                    </span>
                  )}
                  {header.column.columnDef.accessorKey === 'preset' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <QuestionMarkCircledIcon className="ml-1.5 opacity-80 h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Presets are useful for distinguishing multiple deployments of the same protocol on the same chain.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => {
          const variant = `${row.original.chain}-${row.original.preset}`;
          return (
            <TableRow key={row.id} className="hover:bg-gray-900">
              {row.getVisibleCells().map((cell) => {
                const meta: any = cell.column.columnDef.meta;
                return (
                  <TableCell
                    key={cell.id}
                    className={`
                      relative overflow-hidden border-gray-600 whitespace-nowrap
                      ${meta?.isNumeric ? 'text-right' : ''}
                    `}
                  >
                    <Link
                      href={`/packages/${packageName}/${row.original.version}/${variant}`}
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
        })}
      </TableBody>
    </Table>
  );
}
