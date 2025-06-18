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
import { ArrowDownWideNarrow, CircleHelp } from 'lucide-react';
import {
  createColumnHelper,
  useReactTable,
  flexRender,
  getCoreRowModel,
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
import { format } from 'date-fns';
import AddressAdditionalInfo from '@/features/Address/AddressAdditionalInfo';
import { Chain } from '@/types/Chain';
import { initialSelectorDecodeUrl } from '@/helpers/store';
import HoverHighlight from '@/features/Tx/HoverHighlight';
import DetailBadge from '@/features/Tx/detail/DetailBadge';

type AddressListsProps = {
  address: string;
  chain: Chain;
  txs: any[];
  receipts: any[];
};

const AddressLists: React.FC<AddressListsProps> = ({
  address,
  chain,
  txs,
  receipts,
}) => {
  const [isUtcDate, setIsUtcDate] = useState<boolean>(false);
  const [isGasPrice, setIsGasPrice] = useState<boolean>(false);
  const [hoverId, setHoverId] = useState<string>('');
  const [names, setNames] = useState<any>('');

  useEffect(() => {
    const fetchData = async () => {
      const inputs = txs
        .filter((tx: any) => tx.input !== '0x')
        .map((tx: any) => tx.input.slice(0, 10));
      const url = initialSelectorDecodeUrl + inputs.join(',');
      const response = await fetch(url);
      const names = await response.json();
      setNames(names.results);
    };
    fetchData();
  }, []);

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
    contractAddress: string | null | undefined;
  };

  const data = React.useMemo(() => {
    return Object.entries(txs).map(([, tx]): TransactionRow => {
      const receipt = receipts.find((r) => r.transactionHash === tx.hash);
      let method = 'Transfer';
      if (tx.input !== '0x') {
        const functionNames = names[tx.input.slice(0, 10)];
        if (functionNames && functionNames.length > 0) {
          const functionName = functionNames[0];
          const methodname =
            functionNames.length > 0
              ? functionName['name']
              : tx.input.slice(0, 10);
          const match = methodname.match(/([A-Za-z0-9]*)\(/);
          // method =
          //   match[1].length > 10 ? match[1].slice(0, 10) + '...' : match[1];
          method = match[1];
        }
      }

      return {
        detail: '',
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        from: tx.from,
        to: tx.to ? tx.to : '',
        amount: tx.value,
        age: receipt?.timestamp,
        method: method,
        txnFee:
          receipt?.gasUsed && tx.gasPrice
            ? formatEther(BigInt(receipt.gasUsed) * BigInt(tx.gasPrice)).slice(
                0,
                10
              )
            : '',
        gasPrice: tx.gasPrice,
        contractAddress: receipt?.contractAddress,
      };
    });
  }, [names]);
  // }, [txs]);

  // console.log(data);
  const columnHelper = createColumnHelper<TransactionRow>();
  const [openToolTipIndex, setOpenTooltipIndex] = useState<number>();

  const renderFrom = (info: any) => {
    const fromAddress = info.getValue();
    return (
      <div className="flex items-center space-x-3">
        <Link href={`/tx/${chain?.id}/${fromAddress}`}>
          <Tooltip>
            <TooltipTrigger>
              <HoverHighlight
                id={fromAddress}
                hoverId={hoverId}
                setHoverId={setHoverId}
              >
                {`${fromAddress.substring(0, 8)}...${info
                  .getValue()
                  .slice(-6)}`}
              </HoverHighlight>
            </TooltipTrigger>
            <TooltipContent>{fromAddress}</TooltipContent>
          </Tooltip>
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
    const contractAddress = info.row.getValue('contractAddress');

    return (
      <div className="flex items-center space-x-2">
        {toAddress === '' ? (
          <>
            <Tooltip>
              <TooltipTrigger>
                <Link
                  href={`/tx/${chain?.id}/${contractAddress}`}
                  className="flex items-center font-mono border-b border-dotted border-muted-foreground hover:border-solid"
                >
                  <span>Contract Creation</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col itemx-center text-center">
                  <span>New Contract</span>
                  <span>{contractAddress}</span>
                </div>
              </TooltipContent>
            </Tooltip>
            <ClipboardButton text={contractAddress} />
          </>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger>
                {toAddress.toLowerCase() === address.toLowerCase() ? (
                  <HoverHighlight
                    id={toAddress}
                    hoverId={hoverId}
                    setHoverId={setHoverId}
                  >
                    {`${toAddress.substring(0, 8)}...${toAddress.slice(-6)}`}
                  </HoverHighlight>
                ) : (
                  <Link href={`/tx/${chain?.id}/${toAddress}`}>
                    <HoverHighlight
                      id={toAddress}
                      hoverId={hoverId}
                      setHoverId={setHoverId}
                    >
                      {`${toAddress.substring(0, 8)}...${toAddress.slice(-6)}`}
                    </HoverHighlight>
                  </Link>
                )}
              </TooltipTrigger>
              <TooltipContent>{toAddress}</TooltipContent>
            </Tooltip>

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
          txHash={info.row.getValue('hash')}
          method={info.row.getValue('method')}
        />
      ),
      header: () => <CircleHelp className="h-4 w-4" />,
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
      cell: (info: any) => {
        const method = info.getValue();
        return (
          <Tooltip>
            <TooltipTrigger>
              <DetailBadge
                value={method.length > 10 ? method.slice(0, 10) : method}
              />
            </TooltipTrigger>
            <TooltipContent>{method}</TooltipContent>
          </Tooltip>
        );
      },
      header: () => {
        return (
          <div className="flex items-center space-x-2">
            <span>Method</span>
            <Tooltip>
              <TooltipTrigger>
                <CircleHelp className="w-4 h-4" />
              </TooltipTrigger>
              <TooltipContent>
                Function executed based on decoded input data.
              </TooltipContent>
            </Tooltip>
          </div>
        );
      },
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
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsUtcDate(!isUtcDate);
                }}
                className="h-8 px-2"
              >
                <span className="font-mono border-b border-dotted border-muted-foreground hover:border-solid">
                  {isUtcDate ? 'Date Time' : 'Age'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>
                {isUtcDate
                  ? 'Click to show Age Format'
                  : 'Click to show Datetime Format'}
              </span>
            </TooltipContent>
          </Tooltip>
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
        return (
          <span className="text-gray-400">
            {isGasPrice
              ? formatGwei(BigInt(gasPrice)).toLocaleString()
              : txnFee}
          </span>
        );
      },
      header: () => {
        return (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsGasPrice(!isGasPrice);
                }}
                className="h-8 px-2"
              >
                <span className="font-mono border-b border-dotted border-muted-foreground hover:border-solid">
                  {isGasPrice ? 'GasPrice' : 'Txn Fee'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>
                {isGasPrice
                  ? '(Gas Price * Gas Used bt Txn) in Either'
                  : 'Gas Price in Gwei'}
              </span>
            </TooltipContent>
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor('gasPrice', {
      id: 'gasPrice',
      enableHiding: true,
      cell: () => null,
      header: () => null,
    }),
    columnHelper.accessor('contractAddress', {
      id: 'contractAddress',
      enableHiding: true,
      cell: () => null,
      header: () => null,
    }),
  ];

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
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
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
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
