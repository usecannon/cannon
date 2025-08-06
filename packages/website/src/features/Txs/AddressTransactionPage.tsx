import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import AddressLists from '@/features/Address/AddressTxLists';
import { useAddressTransactions } from '@/hooks/useAddressTransactions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { CustomSpinner } from '@/components/CustomSpinner';
import { fetchBlockPages } from '@/lib/address';

function getBlockForPage(
  pageParam: string | string[] | undefined,
  pages: string[]
) {
  const raw = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  const pageNum = Number(raw ?? 1);
  if (isNaN(pageNum) || pageNum <= 1) return '0';
  return pages[pageNum - 2] ?? '0';
}

const AddressTransactionPage = () => {
  const router = useRouter();
  const { a, c, p } = router.query;
  const chainId = Array.isArray(c) ? c[0] : c;
  const { getChainById } = useCannonChains();
  const chain = getChainById(Number(chainId));
  const displayAddress = Array.isArray(a) ? a[0] : a;
  const [blockBefore, setBlockBefore] = useState<number>(0);
  const [pages, setPages] = useState<string[]>([]);
  const cannonChains = useCannonChains();
  const apiUrl = cannonChains.otterscanApis[chain?.id ?? 0]?.rpcUrl;

  useEffect(() => {
    fetchBlockPages(apiUrl, displayAddress ?? '')
      .then((blocks) => setPages(blocks))
      .catch((err) => {
        console.error('failed to fetch pages', err);
        setPages([]);
      });
  }, [displayAddress, apiUrl]);

  useEffect(() => {
    const pageIndex = Array.isArray(p) ? p[0] : p;
    const block = getBlockForPage(pageIndex, pages);
    setBlockBefore(Number(block));
  }, [pages, p]);

  const pagesReady = pages.length > 0 || blockBefore === 0;

  const {
    data: transactionData,
    isLoading,
    isError,
  } = useAddressTransactions(
    parseInt(chainId as string) || 0,
    displayAddress ?? '',
    String(blockBefore),
    pagesReady
  );

  if (!transactionData && isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <CustomSpinner />
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

  const { txs, receipts, isLastPage, isFirstPage } = transactionData;
  const receipt = receipts[receipts.length - 1];
  const blockNumber = String(parseInt(receipt.blockNumber.slice(2), 16));

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4">
      <div className="ml-3">
        <h1 className="text-2xl font-bold mt-4">Transactions</h1>
      </div>
      <div className="ml-3">
        <span>For </span>
        <span>{displayAddress}</span>
      </div>
      <hr className="opacity-75 mt-3" />
      <AddressLists
        address={displayAddress ?? ''}
        chain={chain}
        txs={txs}
        receipts={receipts}
        isLastPage={isLastPage}
        isFirstPage={isFirstPage}
        blockNumber={blockNumber}
        pages={pages}
      />
    </div>
  );
};

export default AddressTransactionPage;
