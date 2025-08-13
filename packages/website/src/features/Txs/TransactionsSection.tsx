import React, { useState, useEffect } from 'react';
import { Chain } from '@/types/Chain';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { useAddressTransactions } from '@/hooks/useAddressTransactions';
import { useBlockPages } from '@/hooks/useBlockPages';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { CustomSpinner } from '@/components/CustomSpinner';
import TransactionsPaginatedList from '@/features/Txs/TransactionsPaginatedList';
import { Card, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';
import { MAX_PAGE_SIZE } from '@/constants/pagination';

type TransactionsSectionProps = {
  address: string;
  chain: Chain;
  pageIndex: string | undefined;
};

const TransactionsSection: React.FC<TransactionsSectionProps> = ({
  address,
  chain,
  pageIndex,
}) => {
  const [blockBefore, setBlockBefore] = useState<number | null>(null);
  const cannonChains = useCannonChains();
  const apiUrl = cannonChains.otterscanApis[chain?.id ?? 0]?.rpcUrl;

  const numericPageIndex = Math.max(Number(pageIndex) || 1, 1);

  const {
    data: blockData,
    isLoading: isBlockLoading,
    isError: isBlockError,
  } = useBlockPages(apiUrl, address);

  const pages = blockData?.pages || [];
  const totalTxs = blockData?.totalTxs || 0;

  useEffect(() => {
    if (!pages || pages.length === 0) {
      setBlockBefore(0);
      return;
    }

    const block =
      numericPageIndex <= 1 ? '0' : pages[numericPageIndex - 2] ?? '0';
    setBlockBefore(Number(block));
  }, [pages, numericPageIndex]);

  const pagesReady = totalTxs > 0;

  const {
    data: transactionData,
    isLoading: isTransactionLoading,
    isError: isTransactionError,
  } = useAddressTransactions(
    chain?.id || 0,
    address,
    String(blockBefore),
    pagesReady ?? false
  );

  if (isTransactionLoading || isBlockLoading) {
    return (
      <div className="flex sm:flex-row flex-col justify-between w-full sm:space-y-0 space-y-2">
        <div className="h-screen w-screen flex flex-col items-center justify-center">
          <div className="flex flex-col items-center space-y-2">
            <CustomSpinner />
            <p className="text-sm text-muted-foreground">
              {isBlockLoading ? 'Loading' : 'Parsing'} transaction data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isTransactionError || isBlockError || !transactionData) {
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

  const pagesMaxSize = pages?.length ?? 0;
  if (
    Number(pageIndex) > MAX_PAGE_SIZE ||
    pagesMaxSize + 1 < Number(pageIndex)
  ) {
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

  return (
    <TransactionsPaginatedList
      address={address}
      chain={chain}
      txs={txs}
      receipts={receipts}
      isLastPage={isLastPage}
      isFirstPage={isFirstPage}
      blockNumber={blockNumber}
      pages={pages}
      totalTxs={totalTxs}
    />
  );
};

export default TransactionsSection;
