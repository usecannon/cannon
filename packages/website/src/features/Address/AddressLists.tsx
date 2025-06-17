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
import { formatEther, formatGwei } from 'viem';
import { ClipboardButton } from '@/components/ClipboardButton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Link from 'next/link';
import { transactions } from './addressDemoData';
import { format } from 'date-fns';
import AddressAdditionalInfo from '@/features/Address/AddressAdditionalInfo';

type AddressListsProps = {
  address: string;
  chain: any;
};

const AddressLists: React.FC<AddressListsProps> = ({ address, chain }) => {
  const [isUtcDate, setIsUtcDate] = useState<boolean>(false);
  const [isGasPrice, setIsGasPrice] = useState<boolean>(false);
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
    gasPrice: string;
  };

  const data = React.useMemo(() => {
    return Object.entries(txs).map(([, tx]): TransactionRow => {
      const receipt = receipts.find((r) => r.transactionHash === tx.hash);

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
        gasPrice: tx.gasPrice,
      };
    });
  }, [txs]);

  // console.log(data);
  const columnHelper = createColumnHelper<TransactionRow>();
  const [openToolTipIndex, setOpenTooltipIndex] = useState<number>();

  const renderFrom = (info: any) => {
    const fromAddress = info.getValue();
    return (
      <div className="flex items-center space-x-3">
        <Link
          href={`/tx/${chain?.id}/${info.getValue()}`}
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
          <span className="inline-flex justify-center items-center w-10 text-center font-bold px-2 py-1 text-xs text-green-700 border border-green-700 border-opacity-75 bg-opacity-10 rounded-lg">
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
              href={`/tx/${chain?.id}/${toAddress}`}
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
                href={`/tx/${chain?.id}/${toAddress}`}
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
      cell: (info: any) => (
        <AddressAdditionalInfo
          info={info}
          openToolTipIndex={openToolTipIndex!}
          setOpenTooltipIndex={setOpenTooltipIndex}
          chain={chain}
        />
      ),
      header: () => <CircleHelp className="h-3 w-3" />,
    }),
    columnHelper.accessor('hash', {
      id: 'hash',
      cell: (info: any) => (
        <div className="flex items-center space-x-2">
          <Link
            href={`/tx/${chain?.id}/${info.getValue()}`}
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
        if (isUtcDate) {
          return format(
            new Date(Number(timestamp) * 1000),
            'yyyy-MM-dd H:mm:ss'
          );
        } else {
          return String(
            formatDistanceToNow(new Date(timestamp * 1000)) + ' ago'
          );
        }
      },
      header: () => {
        return (
          <span className="font-mono border-b border-dotted border-muted-foreground hover:border-solid">
            {isUtcDate ? 'Date Time' : 'Age'}
          </span>
        );
      },
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
        String(
          convertToFormatEther(info.getValue(), chain?.nativeCurrency.symbol) ??
            '0 ETH'
        ),
      header: 'Amount',
    }),
    columnHelper.accessor('txnFee', {
      id: 'txnFee',
      cell: (info: any) => {
        const txnFee = info.getValue();
        const gasPrice = info.row.getValue('gasPrice');
        return isGasPrice
          ? formatGwei(BigInt(gasPrice)).toLocaleString()
          : txnFee;
      },
      header: () => {
        return (
          <span className="font-mono border-b border-dotted border-muted-foreground hover:border-solid">
            {isGasPrice ? 'GasPrice' : 'Txn Fee'}
          </span>
        );
      },
    }),
    columnHelper.accessor('gasPrice', {
      id: 'gasPrice',
      enableHiding: true,
      cell: () => null,
      header: () => null,
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
                          header.column.columnDef.id === 'txnFee' ? (
                            <>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Button
                                    variant="ghost"
                                    onClick={() => {
                                      if (
                                        header.column.columnDef.id === 'age'
                                      ) {
                                        setIsUtcDate(!isUtcDate);
                                      } else {
                                        setIsGasPrice(!isGasPrice);
                                      }
                                    }}
                                    className="h-8 px-2"
                                  >
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {header.column.columnDef.id === 'age' ? (
                                    <span>
                                      {isUtcDate
                                        ? 'Click to show Datetime Format'
                                        : 'Click to show Age Format'}
                                    </span>
                                  ) : (
                                    <span>
                                      {isGasPrice
                                        ? 'Gas Price in Gwei'
                                        : '(Gas Price * Gas Used bt Txn) in Either'}
                                    </span>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </>
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
