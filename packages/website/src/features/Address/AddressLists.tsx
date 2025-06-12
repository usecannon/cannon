import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowDownWideNarrow, ArrowDownUp } from 'lucide-react';
import {
  createColumnHelper,
  useReactTable,
  flexRender,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';

const transactions = {
  jsonrpc: '2.0',
  id: 1,
  result: {
    txs: [
      {
        blockHash:
          '0x43a1fd428449336a564d556a4f5babb0fead594844848ef26bdb8d64743c58e6',
        blockNumber: '0x6dfc67',
        from: '0xe0707eb3a3f115be661b2abfb73b511c61301554',
        gas: '0x16469',
        gasPrice: '0x3a119b1',
        maxPriorityFeePerGas: '0xf4240',
        maxFeePerGas: '0x46bed14',
        hash: '0x508a8f26d9c9343e96597dce0e4523d4f7564715e0dac114ee87747881f925b1',
        input:
          '0xaac438c09604da139220520bf8f3b5b253ecb31ce39490778e9be8b81ce4be94515ff7bc00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000040313733333239353433345f697066733a2f2f516d536b36576a58555254747a756f64536b4264366d6a6d67395544797a484b4d53324c536b5855474c31726a48',
        nonce: '0x2',
        to: '0x14570ce88f490a80342cc156a6a0ebc173609f5e',
        transactionIndex: '0x7c',
        value: '0x0',
        type: '0x2',
        accessList: [],
        chainId: '0xaa36a7',
        v: '0x0',
        yParity: '0x0',
        r: '0x853ed2d5777225e212a0685a1ea709995f369d0df2b75dace53241ea3c335c55',
        s: '0x5c2c5afcbc90f05d113b3f2538502907c2892c6954b1eae8c3d3ce0747fb186c',
      },
      {
        blockHash:
          '0x5da336a17dc540cabaf5b0d7dde294db1e28ea9b8e2e8c416978b55ce5e5d0d6',
        blockNumber: '0x6dfc66',
        from: '0xe0707eb3a3f115be661b2abfb73b511c61301554',
        gas: '0xa9ef',
        gasPrice: '0x3b1d09c',
        maxPriorityFeePerGas: '0xf4240',
        maxFeePerGas: '0x4907ac8',
        hash: '0xd6f642a97ed29bda687f52fb208a20f8aa70a048e949eee984c92bdb8814666c',
        input:
          '0x3fb5c1cb00000000000000000000000000000000000000000000000000000000000001a4',
        nonce: '0x1',
        to: '0x388048fd6f91c1d0b8fc7e92c8dd153e12c280d9',
        transactionIndex: '0x97',
        value: '0x0',
        type: '0x2',
        accessList: [],
        chainId: '0xaa36a7',
        v: '0x1',
        yParity: '0x1',
        r: '0x2200588d9fb49cb57e741d79fcf5608fea73bf87cd8ccd8a718ff041e033894a',
        s: '0x51fe2872f16c809dd1f9a8fe7376c935ed8416b1e467e12582886c4a5cbedb36',
      },
      {
        blockHash:
          '0xf59568875d4254f2daf0fff90c90dfc4db80232f495a06b02cee6c510019914a',
        blockNumber: '0x6dfc65',
        from: '0xe0707eb3a3f115be661b2abfb73b511c61301554',
        gas: '0x1981b',
        gasPrice: '0x3d046b2',
        maxPriorityFeePerGas: '0xf4240',
        maxFeePerGas: '0x3d72cd6',
        hash: '0xa613921d7c75bf09395cf4132473dad6b8039767bb7a6c4c6e7ff51952ca00b7',
        input:
          '0x6080604052348015600e575f5ffd5b5060ec8061001b5f395ff3fe6080604052348015600e575f5ffd5b5060043610603a575f3560e01c80633fb5c1cb14603e5780638381f58a14604f578063d09de08a146068575b5f5ffd5b604d6049366004607d565b5f55565b005b60565f5481565b60405190815260200160405180910390f35b604d5f805490806076836093565b9190505550565b5f60208284031215608c575f5ffd5b5035919050565b5f6001820160af57634e487b7160e01b5f52601160045260245ffd5b506001019056fea2646970667358221220fa49f4ce8b9cbd3848cd128350606f0eb84071d2b55cc5ed387ef5407001680e64736f6c634300081c0033',
        nonce: '0x0',
        to: null,
        transactionIndex: '0x87',
        value: '0x0',
        type: '0x2',
        accessList: [],
        chainId: '0xaa36a7',
        v: '0x0',
        yParity: '0x0',
        r: '0xf5e82a6deb73ca97e792f19a3eeecc380573357d773644de87122d2e7eb241f0',
        s: '0x6cf9148857a115ad4d3419c9a40ff8ff5cd20ed024b57957fa1b77cdc414017',
      },
      {
        blockHash:
          '0x44e8d4ac31a2e84c0df1068d937374a2c8077ae9eb733b80422c90a643de144d',
        blockNumber: '0x6dfc35',
        from: '0x48914229dedd5a9922f44441ffccfc2cb7856ee9',
        gas: '0x7b0c',
        gasPrice: '0x1de5dd9',
        maxPriorityFeePerGas: '0xf4240',
        maxFeePerGas: '0x2711fe3',
        hash: '0x0a7bdd72be519816cbe0d33b9765b8debee6c63645f7b2245eaaecfd0866023c',
        input: '0x',
        nonce: '0x711',
        to: '0xe0707eb3a3f115be661b2abfb73b511c61301554',
        transactionIndex: '0x8b',
        value: '0xde0b6b3a7640000',
        type: '0x2',
        accessList: [],
        chainId: '0xaa36a7',
        v: '0x0',
        yParity: '0x0',
        r: '0x22907d51a1d9d26e8ce37d765484a94fa38ccd2022ac7a681cd43cd7ed35ee3e',
        s: '0x3fc7f601ce9e2e8268a8705070ab9661e848c0d2f79ce5621ff91875e63d033e',
      },
    ],
    receipts: [
      {
        blockHash:
          '0x43a1fd428449336a564d556a4f5babb0fead594844848ef26bdb8d64743c58e6',
        blockNumber: '0x6dfc67',
        contractAddress: null,
        cumulativeGasUsed: '0x7bc06c',
        effectiveGasPrice: '0x3a119b1',
        from: '0xe0707eb3a3f115be661b2abfb73b511c61301554',
        gasUsed: '0x16469',
        logs: [],
        logsBloom:
          '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        status: '0x1',
        timestamp: 1733295444,
        to: '0x14570ce88f490a80342cc156a6a0ebc173609f5e',
        transactionHash:
          '0x508a8f26d9c9343e96597dce0e4523d4f7564715e0dac114ee87747881f925b1',
        transactionIndex: '0x7c',
        type: '0x2',
      },
      {
        blockHash:
          '0x5da336a17dc540cabaf5b0d7dde294db1e28ea9b8e2e8c416978b55ce5e5d0d6',
        blockNumber: '0x6dfc66',
        contractAddress: null,
        cumulativeGasUsed: '0xaa8ddc',
        effectiveGasPrice: '0x3b1d09c',
        from: '0xe0707eb3a3f115be661b2abfb73b511c61301554',
        gasUsed: '0xa9ef',
        logs: [],
        logsBloom:
          '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        status: '0x1',
        timestamp: 1733295432,
        to: '0x388048fd6f91c1d0b8fc7e92c8dd153e12c280d9',
        transactionHash:
          '0xd6f642a97ed29bda687f52fb208a20f8aa70a048e949eee984c92bdb8814666c',
        transactionIndex: '0x97',
        type: '0x2',
      },
      {
        blockHash:
          '0xf59568875d4254f2daf0fff90c90dfc4db80232f495a06b02cee6c510019914a',
        blockNumber: '0x6dfc65',
        contractAddress: '0x388048fd6f91c1d0b8fc7e92c8dd153e12c280d9',
        cumulativeGasUsed: '0x989f58',
        effectiveGasPrice: '0x3d046b2',
        from: '0xe0707eb3a3f115be661b2abfb73b511c61301554',
        gasUsed: '0x1981b',
        logs: [],
        logsBloom:
          '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        status: '0x1',
        timestamp: 1733295420,
        to: null,
        transactionHash:
          '0xa613921d7c75bf09395cf4132473dad6b8039767bb7a6c4c6e7ff51952ca00b7',
        transactionIndex: '0x87',
        type: '0x2',
      },
      {
        blockHash:
          '0x44e8d4ac31a2e84c0df1068d937374a2c8077ae9eb733b80422c90a643de144d',
        blockNumber: '0x6dfc35',
        contractAddress: null,
        cumulativeGasUsed: '0xe68e66',
        effectiveGasPrice: '0x1de5dd9',
        from: '0x48914229dedd5a9922f44441ffccfc2cb7856ee9',
        gasUsed: '0x5208',
        logs: [],
        logsBloom:
          '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        status: '0x1',
        timestamp: 1733294772,
        to: '0xe0707eb3a3f115be661b2abfb73b511c61301554',
        transactionHash:
          '0x0a7bdd72be519816cbe0d33b9765b8debee6c63645f7b2245eaaecfd0866023c',
        transactionIndex: '0x8b',
        type: '0x2',
      },
    ],
    firstPage: false,
    lastPage: true,
  },
};

const AddressLists = () => {
  const txs = transactions.result.txs;
  //   const receipts = transactions.result.receipts;
  //   console.log(txs);
  //   console.log(receipts);

  //   const data: TransactionRow[] = txs.map((tx) => ({
  //     hash: tx.hash,
  //     blockNumber: tx.blockNumber,
  //     from: tx.from,
  //     to: tx.to ?? null,
  //   }));
  type TransactionRow = {
    hash: string;
    blockNumber: string;
    from: string;
    to: string;
    //   age: string;
    //   method: string;
    //   amount: bigint;
    //   txnFee: bigint;
  };

  const data = React.useMemo(() => {
    return Object.entries(txs).map(
      ([, tx]): TransactionRow => ({
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        from: tx.from,
        to: tx.to ?? '',
      })
    );
  }, [txs]);

  const columnHelper = createColumnHelper<TransactionRow>();

  const columns = [
    columnHelper.accessor('hash', {
      cell: (info: any) => info.getValue(),
      header: 'Transaction Hash',
    }),
    columnHelper.accessor('blockNumber', {
      cell: (info: any) => info.getValue(),
      header: 'Block',
    }),
    columnHelper.accessor('from', {
      cell: (info: any) => info.getValue(),
      header: 'From',
    }),
    columnHelper.accessor('to', {
      cell: (info: any) => info.getValue(),
      header: 'To',
    }),
  ];

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'hash', desc: true },
  ]);

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <>
      <Card className="rounded-sm w-full">
        <CardHeader>
          <CardTitle>
            <div className="flex flex-wrap items-center">
              <ArrowDownWideNarrow className="h-4 w-4" />
              <span className="text-sm">
                Latest 25 from a total of 178,500 transactions
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
                          <Button
                            variant="ghost"
                            onClick={header.column.getToggleSortingHandler()}
                            className="h-8 px-2 -ml-2"
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            <ArrowDownUp
                              className={`${
                                // header.column.columnDef.accessorKey ===
                                // 'highlight'
                                //   ? 'h-4 w-4'
                                //   : 'ml-2 h-4 w-4'
                                'ml-2 h-4 w-4'
                              }`}
                            />
                          </Button>
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
                            // switch (cell.column.columnDef.accessorKey) {
                            //   default: {
                            //     return flexRender(
                            //       cell.column.columnDef.cell,
                            //       cell.getContext()
                            //     );
                            //   }
                            // }
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
