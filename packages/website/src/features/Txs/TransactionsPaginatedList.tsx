import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CircleHelp } from 'lucide-react';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
} from '@tanstack/react-table';
import AddressAdditionalInfo from '@/features/Address/AddressAdditionalDialog';
import { Chain } from '@/types/Chain';
import { mapToTransactionList } from '@/lib/address';
import {
  TransactionRow,
  OtterscanTransaction,
  OtterscanReceipt,
} from '@/types/AddressList';
import AmountColumn from '@/features/Address/column/AmountColumn';
import FromColumn from '@/features/Address/column/FromColumn';
import ToColumn from '@/features/Address/column/ToColumn';
import HashColumn from '@/features/Address/column/HashColumn';
import MethodColumn from '@/features/Address/column/MethodColumn';
import MethodHeader from '@/features/Address/column/MethodHeader';
import AgeColumn from '@/features/Address/column/AgeColumn';
import AgeHeader from '@/features/Address/column/AgeHeader';
import TxFeeHeader from '@/features/Address/column/TxFeeHeader';
import TxFeeColumn from '@/features/Address/column/TxFeeColumn';
import BlockColumn from '@/features/Address/column/BlockColumn';
import AddressDataTable from '@/features/Address/AddressDataTable';
import DownloadListButton from '@/features/Address/DownloadListButton';
import TransactionsPagination from '@/features/Txs/TransactionsPagination';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MAX_PAGE_SIZE } from '@/constants/pagination';

type TransactionsPaginatedListProps = {
  address: string;
  chain: Chain;
  txs: OtterscanTransaction[];
  receipts: OtterscanReceipt[];
  isLastPage: boolean;
  isFirstPage: boolean;
  blockNumber: string;
  pages: string[];
  totalTxs: number;
};

const TransactionsPaginatedList: React.FC<TransactionsPaginatedListProps> = ({
  address,
  chain,
  txs,
  receipts,
  isLastPage,
  isFirstPage,
  blockNumber,
  pages,
  totalTxs,
}) => {
  const [isDate, setIsDate] = useState<boolean>(false);
  const [isGasPrice, setIsGasPrice] = useState<boolean>(false);
  const [hoverId, setHoverId] = useState<string>('');
  const chainId = chain?.id ?? 0;
  const data = React.useMemo(() => {
    return mapToTransactionList(txs, receipts);
  }, [txs, receipts]);

  const columnHelper = createColumnHelper<TransactionRow>();
  const [openToolTipIndex, setOpenTooltipIndex] = useState<number | null>();

  const columns = [
    columnHelper.accessor('detail', {
      cell: (info: any) => (
        <AddressAdditionalInfo
          rowIndex={info.row.index}
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
      cell: (info: any) => <HashColumn info={info} chainId={chainId!} />,
      header: 'Transaction Hash',
    }),
    columnHelper.accessor('method', {
      cell: (info: any) => <MethodColumn info={info} />,
      header: () => <MethodHeader />,
    }),
    columnHelper.accessor('blockNumber', {
      cell: (info: any) => <BlockColumn info={info} />,
      header: 'Block',
    }),
    columnHelper.accessor('age', {
      cell: (info: any) => <AgeColumn info={info} isDate={isDate} />,
      header: () => <AgeHeader isDate={isDate} setIsDate={setIsDate} />,
    }),
    columnHelper.accessor('from', {
      cell: (info: any) => (
        <FromColumn
          info={info}
          hoverId={hoverId}
          setHoverId={setHoverId}
          address={address}
          chainId={chainId!}
        />
      ),
      header: 'From',
    }),
    columnHelper.accessor('to', {
      cell: (info: any) => (
        <ToColumn
          info={info}
          hoverId={hoverId}
          setHoverId={setHoverId}
          address={address}
          chainId={chainId!}
        />
      ),
      header: 'To',
    }),
    columnHelper.accessor('amount', {
      cell: (info: any) => (
        <AmountColumn info={info} symbol={chain?.nativeCurrency.symbol!} />
      ),
      header: 'Amount',
    }),
    columnHelper.accessor('txnFee', {
      cell: (info: any) => <TxFeeColumn info={info} isGasPrice={isGasPrice} />,
      header: () => (
        <TxFeeHeader isGasPrice={isGasPrice} setIsGasPrice={setIsGasPrice} />
      ),
    }),
    columnHelper.accessor('gasPrice', {
      enableHiding: true,
      cell: () => null,
      header: () => null,
    }),
    columnHelper.accessor('contractAddress', {
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
          {table.getRowModel().rows.length > 0 && (
            <>
              <CardTitle>
                <div className="flex sm:flex-row flex-col justify-between w-full sm:space-y-0 space-y-2">
                  <div className="flex flex-wrap items-center space-x-1">
                    <span className="text-sm">
                      A total of {totalTxs.toLocaleString()} transactions found
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DownloadListButton
                      txs={txs}
                      receipts={receipts}
                      chain={chain}
                      fileName={`export-${address}.csv`}
                    />
                    {pages.length > 0 && (
                      <TransactionsPagination
                        address={address}
                        chainId={chainId}
                        isLastPage={isLastPage}
                        isFirstPage={isFirstPage}
                        blockNumber={blockNumber}
                        pages={pages}
                      />
                    )}
                  </div>
                </div>
                {!isLastPage &&
                  pages.indexOf(blockNumber) + 1 === MAX_PAGE_SIZE && (
                    <Alert variant="info" className="mt-2">
                      <AlertDescription>
                        This is the maximum number of pages currently supported
                        by this website.
                      </AlertDescription>
                    </Alert>
                  )}
              </CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent>
          <div className="w-full rounded-md border border-border overflow-x-auto">
            <AddressDataTable table={table} />
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default TransactionsPaginatedList;
