import React from 'react';
import { useRouter } from 'next/router';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import TransactionListSection from '@/features/Txs/TransactionListSection';

const AddressTransactionPage = () => {
  const router = useRouter();
  const { a, c, p } = router.query;
  const chainId = Array.isArray(c) ? c[0] : c;
  const { getChainById } = useCannonChains();
  const chain = getChainById(Number(chainId));
  const displayAddress = Array.isArray(a) ? a[0] : a;

  const pageIndex = Array.isArray(p) ? p[0] : p;

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
      <TransactionListSection
        address={displayAddress ?? ''}
        chain={chain}
        pageIndex={pageIndex}
      />
    </div>
  );
};

export default AddressTransactionPage;
