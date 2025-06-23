import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { flexRender } from '@tanstack/react-table';
import { Inbox } from 'lucide-react';

type AddressDataTableProps = {
  table: any;
};

const AddressDataTable: React.FC<AddressDataTableProps> = ({ table }) => {
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
                      header.column.columnDef.id === 'detail'
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
      </Table>
    </>
  );
};

export default AddressDataTable;
