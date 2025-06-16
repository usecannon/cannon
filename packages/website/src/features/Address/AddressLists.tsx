import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowDownWideNarrow,
  Eye,
  CircleHelp,
  Check,
  MoveUpRight,
} from 'lucide-react';
import {
  createColumnHelper,
  useReactTable,
  flexRender,
  getCoreRowModel,
  // SortingState,
  // getSortedRowModel,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { convertToFormatEther } from '@/features/Address/AddressPage';
import { formatEther } from 'viem';
import { ClipboardButton } from '@/components/ClipboardButton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Link from 'next/link';
import { transactions } from './addressDemoData';

type AddressListsProps = {
  address: string;
  symbol: string;
};

const AddressLists: React.FC<AddressListsProps> = ({ address, symbol }) => {
  const txs = transactions.result.txs;
  const receipts = transactions.result.receipts;
  //   console.log(txs);
  //   console.log(receipts);

  type TransactionRow = {
    detail: string;
    hash: string;
    blockNumber: string;
    from: string;
    to: string;
    age: number | undefined;
    method: string;
    amount: string;
    txnFee: string;
  };

  const data = React.useMemo(() => {
    return Object.entries(txs).map(([, tx]): TransactionRow => {
      const receipt = receipts.find((r) => r.transactionHash === tx.hash);
      // console.log(`gasPrice : ${parseInt(tx.gasPrice.slice(2), 16)}`);
      return {
        detail: '',
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        from: tx.from,
        to: tx.to ? tx.to : '',
        amount: tx.value,
        age: receipt?.timestamp,
        method: 'Transfer',
        txnFee:
          receipt?.gasUsed && tx.gasPrice
            ? formatEther(BigInt(receipt.gasUsed) * BigInt(tx.gasPrice)).slice(
                0,
                10
              )
            : '',
      };
    });
  }, [txs]);

  // console.log(data);
  const columnHelper = createColumnHelper<TransactionRow>();
  const [openToolTipIndex, setOpenTooltipIndex] = useState<number>();

  const renderDetail = (info: any) => {
    const rowIndex = info.row.index;

    return (
      <>
        <Tooltip open={openToolTipIndex === rowIndex}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="px-2 py-1 text-xs text-gray-200 border border-gray-800 bg-gray-800 border-opacity-75 bg-opacity-0 rounded-lg"
              onClick={() => setOpenTooltipIndex(info.row.index)}
            >
              <Eye className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            align="start"
            className="w-auto overflow-y-auto overflow-x-hidden"
          >
            <h5 className="mb-4">Additional Info</h5>
            <div className="mb-4">
              <h6 className="font-bold mb-1">Status:</h6>
              <div className="flex items-center space-x-1">
                <Check className="w-3 h-3 items-center justify-center text-xs text-green-900 rounded-full font-bold bg-green-200 border border-green-200" />
                <span className="text-green-200">Success</span>
                <span className="text-gray-400">
                  (124543 Block Confirmations)
                </span>
              </div>
            </div>
            <hr />
            <div className="my-4">
              <h6 className="font-bold mb-1">Transaction Action:</h6>
              <div className="flex items-center space-x-1">
                <span className="text-gray-400">Transfer</span>
                <span className="">0.023748243 ETH</span>
                <span className="text-gray-400">to</span>
                <span className="">0xsdas...dajso</span>
              </div>
            </div>
            <hr />
            <div className="my-4">
              <h6 className="font-bold mb-1">Transaction Fee:</h6>
              <div className="flex items-center space-x-1">
                <span className="">0.139002394900254 ETH</span>
              </div>
            </div>
            <hr />
            <div className="my-4">
              <h6 className="font-bold mb-1">Gas Info:</h6>
              <div className="flex items-center space-x-1">
                <span className="">2,1000 gas used from 21000 limit</span>
              </div>
            </div>
            <hr />
            <div className="my-4">
              <h6 className="font-bold mb-1">Nounce:</h6>
              <div className="flex items-center space-x-1">
                <span className="">24123</span>
                <span className="text-gray-400">(in the position 348)</span>
              </div>
            </div>
            <hr />
            <div className="my-4">
              <div className="flex items-center space-x-1">
                <Link
                  href="/tx/xxxxxxxx"
                  className="flex items-center font-mono border-b border-dotted border-muted-foreground hover:border-solid"
                >
                  <span>See more details</span>
                  <MoveUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </>
    );
  };

  const renderFrom = (info: any) => {
    const fromAddress = info.getValue();
    return (
      <div className="flex items-center space-x-3">
        <Link
          href={`/tx/${info.getValue()}`}
          className="flex items-center font-mono border-b border-dotted border-muted-foreground hover:border-solid"
        >
          <span>{`${fromAddress.substring(0, 8)}...${info
            .getValue()
            .slice(-6)}`}</span>
        </Link>
        <ClipboardButton text={fromAddress} />
        {fromAddress.toLowerCase() === address.toLowerCase() ? (
          <span className="inline-flex justify-center items-center w-10 text-center font-bold px-2 py-1 text-xs text-yellow-700 border border-yellow-700 border-opacity-75 bg-opacity-10 rounded-lg">
            OUT
          </span>
        ) : (
          <span className="inline-flex justify-center items-center w-10 text-center w-10 font-bold px-2 py-1 text-xs text-green-700 border border-green-700 border-opacity-75 bg-opacity-10 rounded-lg">
            IN
          </span>
        )}
      </div>
    );
  };

  const renderTo = (info: any) => {
    const toAddress = info.getValue();
    return (
      <div className="flex items-center space-x-2">
        {toAddress === '' ? (
          <>
            <Link
              href={`/tx/${toAddress}`}
              className="flex items-center font-mono border-b border-dotted border-muted-foreground hover:border-solid"
            >
              <span>Contract Creation</span>
            </Link>
            <ClipboardButton text={'test'} />
          </>
        ) : (
          <>
            {toAddress.toLowerCase() === address.toLowerCase() ? (
              <span>{`${toAddress.substring(0, 8)}...${toAddress.slice(
                -6
              )}`}</span>
            ) : (
              <Link
                href={`/tx/${toAddress}`}
                className="flex items-center font-mono border-b border-dotted border-muted-foreground hover:border-solid"
              >
                <span>{`${toAddress.substring(0, 8)}...${toAddress.slice(
                  -6
                )}`}</span>
              </Link>
            )}
            <ClipboardButton text={toAddress} />
          </>
        )}
      </div>
    );
  };

  const columns = [
    columnHelper.accessor('detail', {
      id: 'detail',
      cell: (info: any) => renderDetail(info),
      header: () => <CircleHelp className="h-3 w-3" />,
    }),
    columnHelper.accessor('hash', {
      id: 'hash',
      cell: (info: any) => (
        <div className="flex items-center space-x-2">
          <Link
            href={`/tx/${info.getValue()}`}
            className="flex items-center font-mono border-b border-dotted border-muted-foreground hover:border-solid"
          >
            <span>{`${info.getValue().slice(0, 12)}...`}</span>
          </Link>
          <ClipboardButton text={info.getValue()} />
        </div>
      ),
      header: 'Transaction Hash',
    }),
    columnHelper.accessor('method', {
      id: 'method',
      cell: (info: any) => (
        <span className="px-2 py-1 text-xs font-semibold text-gray-200 border border-gray-800 bg-gray-800 rounded-lg">
          {info.getValue()}
        </span>
      ),
      header: 'Method',
    }),
    columnHelper.accessor('blockNumber', {
      id: 'blockNumber',
      cell: (info: any) => String(parseInt(info.getValue().slice(2), 16)),
      header: 'Block',
    }),
    columnHelper.accessor('age', {
      id: 'age',
      cell: (info: any) => {
        const timestamp = info.getValue();
        return String(formatDistanceToNow(new Date(timestamp * 1000)) + ' ago');
      },
      header: 'Age',
    }),
    columnHelper.accessor('from', {
      id: 'from',
      cell: (info: any) => renderFrom(info),
      header: 'From',
    }),
    columnHelper.accessor('to', {
      id: 'to',
      cell: (info: any) => renderTo(info),
      header: 'To',
    }),
    columnHelper.accessor('amount', {
      id: 'amount',
      cell: (info: any) =>
        String(convertToFormatEther(info.getValue(), symbol) ?? '0 ETH'),
      header: 'Amount',
    }),
    columnHelper.accessor('txnFee', {
      id: 'txnFee',
      cell: (info: any) => String(info.getValue()),
      header: 'Txn Fee',
    }),
  ];

  // const [sorting, setSorting] = React.useState<SortingState>([
  //   { id: 'hash', desc: true },
  // ]);

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    // onSortingChange: setSorting,
    // getSortedRowModel: getSortedRowModel(),
    // state: {
    //   sorting,
    // },
  });

  return (
    <>
      <Card className="rounded-sm w-full">
        <CardHeader>
          <CardTitle>
            <div className="flex flex-wrap items-center">
              <ArrowDownWideNarrow className="h-4 w-4" />
              <span className="text-sm">
                Latest 25 from a total transactions
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                          {header.column.columnDef.id === 'age' ||
                          header.column.columnDef.id === 'amount' ||
                          header.column.columnDef.id === 'txnFee' ? (
                            <Button
                              variant="ghost"
                              onClick={header.column.getToggleSortingHandler()}
                              className="h-8 px-2"
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
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
                {table.getRowModel().rows.map((row) => (
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
                    `}
                        >
                          {(() => {
                            switch (cell.column.columnDef.id) {
                              default: {
                                return flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                );
                              }
                            }
                            return flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            );
                          })()}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AddressLists;
