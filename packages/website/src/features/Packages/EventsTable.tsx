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
import { Button } from '@/components/ui/button';
import { CaretSortIcon } from '@radix-ui/react-icons';
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table';

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
    <div className="w-full rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-border">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
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
              ))}
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
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
