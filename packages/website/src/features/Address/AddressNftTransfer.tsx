import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowDownWideNarrow, CircleHelp } from 'lucide-react';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
} from '@tanstack/react-table';
import AddressAdditionalInfo from '@/features/Address/AddressAdditionalDialog';
import { Chain } from '@/types/Chain';
import { NftTransferRow } from '@/types/AddressList';
import AddressDataTable from '@/features/Address/AddressDataTable';
import FromColumn from '@/features/Address/column/FromColumn';
import ToColumn from '@/features/Address/column/ToColumn';
import HashColumn from '@/features/Address/column/HashColumn';
import MethodColumn from '@/features/Address/column/MethodColumn';
import MethodHeader from '@/features/Address/column/MethodHeader';
import AgeColumn from '@/features/Address/column/AgeColumn';
import AgeHeader from '@/features/Address/column/AgeHeader';
import BlockColumn from '@/features/Address/column/BlockColumn';
import TypeColumn from '@/features/Address/column/TypeColumn';
import { erc721Hash } from '@/features/Address/AddressPage';
import DownloadListButton from '@/features/Address/DownloadListButton';
import { OtterscanTransaction, OtterscanReceipt } from '@/types/AddressList';

type AddressNftTransferProps = {
  address: string;
  txs: any[];
  receipts: any[];
  chain: Chain;
};

const AddressNftTransfer: React.FC<AddressNftTransferProps> = ({
  address,
  txs,
  receipts,
  chain,
}) => {
  const [hoverId, setHoverId] = useState<string>('');
  const [openToolTipIndex, setOpenTooltipIndex] = useState<number | null>();
  const [isDate, setIsDate] = useState<boolean>(false);

  const data = React.useMemo(() => {
    return Object.entries(receipts).map(([, receipt]): NftTransferRow => {
      const tx = txs.find((t) => receipt.transactionHash === t.hash);

      return {
        detail: '',
        hash: tx.hash,
        method: tx.method,
        blockNumber: tx.blockNumber,
        age: receipt?.timestamp,
        from: tx.from,
        to: tx.to ? tx.to : '',
        contractAddress: receipt?.contractAddress,
        type: receipt.logs[0].topics[0] === erc721Hash ? 'ERC-721' : 'ERC-1155',
      };
    });
  }, [txs, receipts]);

  const columnHelper = createColumnHelper<NftTransferRow>();

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
    columnHelper.accessor('type', {
      cell: (info: any) => <TypeColumn info={info} />,
      header: () => 'Type',
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
                  <ArrowDownWideNarrow className="h-4 w-4" />
                  <span className="text-sm">
                    Latest {table.getRowModel().rows.length} from a total
                    transactions
                  </span>
                </div>
                <DownloadListButton
                  txs={txs}
                  receipts={receipts}
                  chain={chain}
                  fileName={`export-nft-transfer-${address}.csv`}
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

export default AddressNftTransfer;
