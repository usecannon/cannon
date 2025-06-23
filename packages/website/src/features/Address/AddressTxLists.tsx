import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowDownWideNarrow, CircleHelp } from 'lucide-react';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
} from '@tanstack/react-table';
import { convertToFormatEther } from '@/features/Address/AddressPage';
import { formatEther } from 'viem';
import AddressAdditionalInfo from '@/features/Address/column/AddressAdditionalInfo';
import { Chain } from '@/types/Chain';
import {
  getMethods,
  matchFunctionName,
  mapToTransactionLlist,
} from '@/lib/address';
import { TransactionRow } from '@/types/AddressList';
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
      const results = await getMethods(txs);
      setNames(results);
    };
    fetchData();
  }, []);

  const data = React.useMemo(() => {
    return mapToTransactionLlist(txs, receipts, names);
  }, [names]);
  // }, [txs]);

  const columnHelper = createColumnHelper<TransactionRow>();
  const [openToolTipIndex, setOpenTooltipIndex] = useState<number>();

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
    columnHelper.accessor('txnFee', {
      id: 'txnFee',
      cell: (info: any) => <TxFeeColumn info={info} isGasPrice={isGasPrice} />,
      header: () => (
        <TxFeeHeader isGasPrice={isGasPrice} setIsGasPrice={setIsGasPrice} />
      ),
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
          {table.getRowModel().rows.length > 0 && (
            <CardTitle>
              <div className="flex flex-wrap items-center space-x-1">
                <ArrowDownWideNarrow className="h-4 w-4" />
                <span className="text-sm">
                  Latest 25 from a total transactions
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

export default AddressLists;
