import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowDownWideNarrow, CircleHelp } from 'lucide-react';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
} from '@tanstack/react-table';
import { convertToFormatEther } from '@/features/Address/AddressPage';
import AddressAdditionalInfo from '@/features/Address/column/AddressAdditionalInfo';
import { Chain } from '@/types/Chain';
import { TokenTransferRow } from '@/types/AddressList';
import { getMethods, mapToTokenTransferList } from '@/lib/address';
import AddressDataTable from '@/features/Address/AddressDataTable';
import FromColumn from '@/features/Address/column/FromColumn';
import ToColumn from '@/features/Address/column/ToColumn';
import HashColumn from '@/features/Address/column/HashColumn';
import MethodColumn from '@/features/Address/column/MethodColumn';
import MethodHeader from '@/features/Address/column/MethodHeader';
import AgeColumn from '@/features/Address/column/AgeColumn';
import AgeHeader from '@/features/Address/column/AgeHeader';
import BlockColumn from '@/features/Address/column/BlockColumn';

const erc20Hash =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

type AddressTokenTransferProps = {
  address: string;
  txs: any[];
  receipts: any[];
  chain: Chain;
};

const AddressTokenTransfer: React.FC<AddressTokenTransferProps> = ({
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
    if (receipt.logs.length > 0 && receipt.logs[0].topics[0] === erc20Hash) {
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
    return mapToTokenTransferList(txs, filteredReceipts, names);
  }, [names]);

  const columnHelper = createColumnHelper<TokenTransferRow>();

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
    columnHelper.accessor('amount', {
      id: 'amount',
      cell: (info: any) =>
        String(
          convertToFormatEther(info.getValue(), chain?.nativeCurrency.symbol) ??
            '0 ETH'
        ),
      header: 'Amount',
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
                  Latest xx ERC-20 Token Transfer Events
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

export default AddressTokenTransfer;
