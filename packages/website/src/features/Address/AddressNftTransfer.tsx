import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowDownWideNarrow, CircleHelp } from 'lucide-react';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
} from '@tanstack/react-table';
import AddressAdditionalInfo from '@/features/Address/column/AddressAdditionalInfo';
import { Chain } from '@/types/Chain';
import { NftTransferRow } from '@/types/AddressList';
import { getMethods, matchFunctionName } from '@/lib/address';
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

const erc721Hash =
  ' 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const erc1155Hash =
  '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';

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
  const [openToolTipIndex, setOpenTooltipIndex] = useState<number>();
  const [isUtcDate, setIsUtcDate] = useState<boolean>(false);
  const [names, setNames] = useState<any>('');

  const filteredReceipts = receipts.filter((receipt) => {
    if (
      receipt.logs.length > 0 &&
      (receipt.logs[0].topics[0] === erc721Hash ||
        receipt.logs[0].topics[0] === erc1155Hash)
    ) {
      return true;
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      const results = await getMethods(txs);
      setNames(results);
    };
    fetchData();
  }, []);

  const data = React.useMemo(() => {
    return Object.entries(filteredReceipts).map(
      ([, receipt]): NftTransferRow => {
        const tx = txs.find((t) => receipt.transactionHash === t.hash);
        const method = matchFunctionName(names, tx.input ?? '');

        return {
          detail: '',
          hash: tx.hash,
          method: method,
          blockNumber: tx.blockNumber,
          age: receipt?.timestamp,
          from: tx.from,
          to: tx.to ? tx.to : '',
          contractAddress: receipt?.contractAddress,
          type:
            receipt.logs[0].topics[0] === erc721Hash ? 'ERC-721' : 'ERC-1155',
        };
      }
    );
  }, [names]);

  const columnHelper = createColumnHelper<NftTransferRow>();

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
      cell: (info: any) => <HashColumn info={info} chainId={chain?.id!} />,
      header: 'Transaction Hash',
    }),
    columnHelper.accessor('method', {
      id: 'method',
      cell: (info: any) => <MethodColumn info={info} />,
      header: () => <MethodHeader />,
    }),
    columnHelper.accessor('blockNumber', {
      id: 'blockNumber',
      cell: (info: any) => <BlockColumn info={info} />,
      header: 'Block',
    }),
    columnHelper.accessor('age', {
      id: 'age',
      cell: (info: any) => <AgeColumn info={info} isUtcDate={isUtcDate} />,
      header: () => (
        <AgeHeader isUtcDate={isUtcDate} setIsUtcDate={setIsUtcDate} />
      ),
    }),
    columnHelper.accessor('from', {
      id: 'from',
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
      id: 'to',
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
      id: 'type',
      cell: (info: any) => <TypeColumn info={info} />,
      header: () => 'Type',
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
          {table.getRowModel().rows.length > 0 && (
            <CardTitle>
              <div className="flex flex-wrap items-center space-x-1">
                <ArrowDownWideNarrow className="h-4 w-4" />
                <span className="text-sm">
                  Latest 5 from a total transactions
                </span>
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
