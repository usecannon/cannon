import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { flexRender } from '@tanstack/react-table';
import { Inbox, MoveRight } from 'lucide-react';
import Link from 'next/link';

type AddressDataTableProps = {
  table: any;
  url?: string;
};

const AddressDataTable: React.FC<AddressDataTableProps> = ({
  table,
  url = '',
}) => {
  return (
    <>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup: any) => (
            <TableRow key={headerGroup.id} className="border-border">
              {headerGroup.headers.map((header: any) => {
                const meta: any = header.column.columnDef.meta;
                return (
                  <TableHead
                    key={header.id}
                    className={
                      header.column.columnDef.accessorKey === 'detail'
                        ? 'flex items-center justify-center'
                        : meta?.isNumeric
                        ? 'text-right'
                        : ''
                    }
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            <>
              {table.getRowModel().rows.map((row: any) => (
                <TableRow
                  key={row.id}
                  className="border-border hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell: any) => {
                    const meta: any = cell.column.columnDef.meta;
                    return (
                      <TableCell
                        key={cell.id}
                        className={`relative overflow-hidden whitespace-nowrap ${
                          meta?.isNumeric ? 'text-right' : ''
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </>
          ) : (
            <TableRow>
              <TableCell colSpan={table.getAllColumns().length}>
                <div className="flex flex-col items-center justify-center h-40 space-y-3">
                  <span className="rounded-full border border-gray-400 p-2 bg-gray-700">
                    <Inbox className="h-8 w-8 text-white" />
                  </span>
                  <h1 className="text-lg">There are no matching entries</h1>
                  <span className="text-sm text-gray-400">
                    Please try again later
                  </span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {url && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={table.getAllColumns().length}>
                <div className="flex items-center justify-center py-3">
                  <Link
                    href={url}
                    className="flex text-sm font-mono border-b border-dotted border-muted-foreground hover:border-solid"
                  >
                    <span>VIEW ALL TRANSACTIONS</span>
                    <MoveRight className="h-4 w-4 ml-3" />
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </>
  );
};

export default AddressDataTable;
