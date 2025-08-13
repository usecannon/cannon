import React from 'react';
import { useRouter } from 'next/router';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import TransactionsSection from '@/features/Txs/TransactionsSection';
import Link from 'next/link';

const AddressTransactionPage = () => {
  const router = useRouter();
  const { a, c, p } = router.query;
  const chainId = Array.isArray(c) ? c[0] : c;
  const { getChainById, getExplorerUrl } = useCannonChains();
  const chain = getChainById(Number(chainId));
  const displayAddress = Array.isArray(a) ? a[0] : a;

  const pageIndex = Array.isArray(p) ? p[0] : p;
  const explorerUrl = getExplorerUrl(chain?.id || 0, displayAddress ?? '');

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4">
      <div className="ml-3">
        <h1 className="text-2xl font-bold mt-4">Transactions</h1>
      </div>
      <div className="ml-3 flex items-baseline space-x-2">
        <span>For</span>
        <Link
          href={explorerUrl}
          className="flex text-sm font-mono border-b border-dotted border-muted-foreground hover:border-solid"
        >
          {displayAddress}
        </Link>
      </div>
      <hr className="opacity-75 mt-3" />
      <TransactionsSection
        address={displayAddress ?? ''}
        chain={chain}
        pageIndex={pageIndex}
      />
    </div>
  );
};

export default AddressTransactionPage;
