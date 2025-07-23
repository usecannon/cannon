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
import { TokenTransferRow } from '@/types/AddressList';
import { mapToTokenTransferList } from '@/lib/address';
import AddressDataTable from '@/features/Address/AddressDataTable';
import AmountColumn from '@/features/Address/column/AmountColumn';
import FromColumn from '@/features/Address/column/FromColumn';
import ToColumn from '@/features/Address/column/ToColumn';
import HashColumn from '@/features/Address/column/HashColumn';
import MethodColumn from '@/features/Address/column/MethodColumn';
import MethodHeader from '@/features/Address/column/MethodHeader';
import AgeColumn from '@/features/Address/column/AgeColumn';
import AgeHeader from '@/features/Address/column/AgeHeader';
import BlockColumn from '@/features/Address/column/BlockColumn';
import DownloadListButton from '@/features/Address/DownloadListButton';
import { OtterscanTransaction, OtterscanReceipt } from '@/types/AddressList';
import { erc20Hash } from '@/features/Address/AddressPage';

type AddressTokenTransferProps = {
  address: string;
  txs: OtterscanTransaction[];
  receipts: OtterscanReceipt[];
  chain: Chain;
};

const AddressTokenTransfer: React.FC<AddressTokenTransferProps> = ({
  address,
  txs,
  receipts,
  chain,
}) => {
  const [hoverId, setHoverId] = useState<string>('');
  const [openToolTipIndex, setOpenTooltipIndex] = useState<number | null>();
  const [isDate, setIsDate] = useState<boolean>(false);

  const tokenReceipts = receipts.flatMap((receipt) => {
    return receipt.logs
      .filter((log) => log.topics?.[0]?.toLowerCase() === erc20Hash)
      .reverse()
      .map((log) => {
        return {
          hash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          timestamp: receipt.timestamp,
          from: '0x' + log.topics[1].slice(26),
          to: '0x' + log.topics[2].slice(26),
          amount: log.data,
          contractAddress: receipt.contractAddress,
        };
      });
  });

  const data = React.useMemo(() => {
    return mapToTokenTransferList(txs, tokenReceipts);
  }, [txs, receipts]);
  const columnHelper = createColumnHelper<TokenTransferRow>();

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
      cell: (info: any) => <HashColumn info={info} chainId={chain?.id!} />,
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
          chainId={chain?.id!}
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
          chainId={chain?.id!}
        />
      ),
      header: 'To',
    }),
    columnHelper.accessor('amount', {
      cell: (info: any) => <AmountColumn info={info} />,
      header: 'Amount',
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
            <CardTitle>
              <div className="flex sm:flex-row flex-col justify-between w-full sm:space-y-0 space-y-2">
                <div className="flex flex-wrap items-center space-x-1">
                  <span className="text-sm">
                    Latest {table.getRowModel().rows.length} ERC-20 Token
                    Transfer Events
                  </span>
                </div>
                <DownloadListButton
                  txs={txs}
                  receipts={receipts}
                  chain={chain}
                  fileName={`export-token-transfer-${address}.csv`}
                />
              </div>
            </CardTitle>
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

export default AddressTokenTransfer;
