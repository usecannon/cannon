import React, { useState, useEffect } from 'react';
import { Chain } from '@/types/Chain';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { useAddressTransactions } from '@/hooks/useAddressTransactions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { CustomSpinner } from '@/components/CustomSpinner';
import { fetchBlockPages, maxPageSize } from '@/lib/address';
import AddressTxListPagenated from '@/features/Txs/AddressTxListPagenated';
import { Card, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';

type TransactionListSectionProps = {
  address: string;
  chain: Chain;
  pageIndex: string | undefined;
};

function getBlockForPage(
  pageParam: string | string[] | undefined,
  pages: string[]
) {
  const raw = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  const pageNum = Number(raw ?? 1);
  if (isNaN(pageNum) || pageNum <= 1) return '0';
  return pages[pageNum - 2] ?? '0';
}

const TransactionListSection: React.FC<TransactionListSectionProps> = ({
  address,
  chain,
  pageIndex,
}) => {
  const [blockBefore, setBlockBefore] = useState<number | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const cannonChains = useCannonChains();
  const apiUrl = cannonChains.otterscanApis[chain?.id ?? 0]?.rpcUrl;

  useEffect(() => {
    fetchBlockPages(apiUrl, address)
      .then((blocks) => setPages(blocks))
      .catch((err) => {
        console.error('failed to fetch pages', err);
        setPages([]);
      });
  }, [address, apiUrl]);

  useEffect(() => {
    const block = getBlockForPage(pageIndex, pages);
    setBlockBefore(Number(block));
  }, [pages, pageIndex]);

  const pagesReady = pages.length > 0;

  const {
    data: transactionData,
    isLoading,
    isError,
  } = useAddressTransactions(
    chain?.id || 0,
    address,
    String(blockBefore),
    pagesReady
  );

  console.log(
    `isLoading : ${isLoading}, isError : ${isError}, !transaction : ${!transactionData}, blockBefore : ${blockBefore}, pageIndex: ${getBlockForPage(
      pageIndex,
      pages
    )}`
  );

  if (!pagesReady || blockBefore === null || isLoading) {
    return (
      <div className="flex sm:flex-row flex-col justify-between w-full sm:space-y-0 space-y-2">
        <div className="h-screen w-screen flex flex-col items-center justify-center">
          <CustomSpinner />
        </div>
      </div>
    );
  }

  if (isError || !transactionData) {
    return (
      <div className="w-full max-w-screen-xl mx-auto px-4 mt-3">
        <Alert variant="destructive">
          <AlertDescription>
            Transaction data is not available. This chain may not be set up with
            block explorer (Otterscan API) support. Please set up a block
            explorer API on the <Link href="/settings">Settings</Link> page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  //Page size is over max page size.
  if (Number(pageIndex) > maxPageSize) {
    return (
      <Card className="rounded-sm w-full">
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 space-y-3 pt-7">
            <span className="rounded-full border border-gray-400 p-2 bg-gray-700">
              <Inbox className="h-8 w-8 text-white" />
            </span>
            <h1 className="text-lg">Max Page Limit</h1>
            <span className="text-sm text-gray-400">
              This is the maximum number of pages currently supported by this
              website.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { txs, receipts, isLastPage, isFirstPage } = transactionData;
  const receipt = receipts[receipts.length - 1];
  const blockNumber = String(parseInt(receipt.blockNumber.slice(2), 16));
  //   console.log(`pages length : ${pages.length}`);
  console.log(pages);
  console.log(
    `page.length : ${
      pages.length
    } : maxPageSize : ${maxPageSize} , pages.indexOf(blockNumber) : ${pages.indexOf(
      blockNumber
    )}, blockNumber : ${blockNumber}`
  );

  return (
    <AddressTxListPagenated
      address={address}
      chain={chain}
      txs={txs}
      receipts={receipts}
      isLastPage={isLastPage}
      isFirstPage={isFirstPage}
      blockNumber={blockNumber}
      pages={pages}
    />
  );
};

export default TransactionListSection;
