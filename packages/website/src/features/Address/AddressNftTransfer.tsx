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
import {
  NftTokenType,
  NftTransferRow,
  OtterscanTransaction,
  OtterscanReceipt,
} from '@/types/AddressList';
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
import DownloadListButton from '@/features/Address/DownloadListButton';
import { mapToNftTransferList } from '@/lib/address';
import { ERC_EVENT_SIGNATURES } from '@/constants/eventSignatures';
import { TabId } from '@/lib/address';

type AddressNftTransferProps = {
  address: string;
  txs: OtterscanTransaction[];
  receipts: OtterscanReceipt[];
  chain: Chain;
  activeTab: TabId;
};

const AddressNftTransfer: React.FC<AddressNftTransferProps> = ({
  address,
  txs,
  receipts,
  chain,
  activeTab,
}) => {
  const [hoverId, setHoverId] = useState<string>('');
  const [openToolTipIndex, setOpenTooltipIndex] = useState<number | null>();
  const [isDate, setIsDate] = useState<boolean>(false);

  const nftTransfers: NftTokenType[] = receipts.flatMap((receipt) =>
    receipt.logs
      .filter(
        (log: any) =>
          (log.topics[0] === ERC_EVENT_SIGNATURES.ERC721_TRANSFER &&
            log.topics.length === 4 &&
            log.data === '0x') ||
          (log.topics[0] === ERC_EVENT_SIGNATURES.ERC1155_TRANSFER_SINGLE &&
            log.topics.length === 4 &&
            log.data !== '0x')
      )
      .map((log: any) => ({
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        timestamp: receipt.timestamp,
        from:
          log.topics[0] === ERC_EVENT_SIGNATURES.ERC721_TRANSFER
            ? '0x' + log.topics[1].slice(26)
            : '0x' + log.topics[2].slice(26),
        to:
          log.topics[0] === ERC_EVENT_SIGNATURES.ERC721_TRANSFER
            ? '0x' + log.topics[2].slice(26)
            : '0x' + log.topics[3].slice(26),
        contractAddress: receipt.contractAddress,
        type:
          log.topics[0] === ERC_EVENT_SIGNATURES.ERC721_TRANSFER
            ? 'ERC-721'
            : 'ERC-1155',
      }))
  );

  // const test = receipts.filter((receipt) => receipt.blockNumber === '0x86a791');
  // console.log(test);

  const data = React.useMemo(() => {
    return mapToNftTransferList(txs, nftTransfers);
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
                  nftTransfers={nftTransfers}
                  chain={chain}
                  fileName={`export-nft-transfer-${address}.csv`}
                  activeTab={activeTab}
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
