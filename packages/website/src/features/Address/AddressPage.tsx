import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ClipboardButton } from '@/components/ClipboardButton';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import AddressTab from '@/features/Address/AddressTab';
import QrcodeDialog from '@/components/QrcodeDialog';
import AddressOverview from '@/features/Address/AddressOverview';
import AddressMoreInfo from '@/features/Address/AddressMoreInfo';
import AddressMultiChain from '@/features/Address/AddressMultiChain';
import AddressLists from '@/features/Address/AddressTxLists';
import AddressTokenTransfer from '@/features/Address/AddressTokenTransfer';
import AddressNftTransfer from '@/features/Address/AddressNftTransfer';
import { useAddressTransactions } from '@/hooks/useAddressTransactions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { tabs, TabId, fetchBlockPages } from '@/lib/address';
import Link from 'next/link';
import { CustomSpinner } from '@/components/CustomSpinner';

const AddressPage = () => {
  const router = useRouter();
  const { chainId, address } = router.query;
  const [activeTab, setActiveTab] = useState<TabId>('transactions');
  const { getChainById } = useCannonChains();
  const chain = getChainById(Number(chainId));
  const displayAddress = Array.isArray(address) ? address[0] : address;
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

  const {
    data: transactionData,
    isLoading,
    isError,
  } = useAddressTransactions(
    parseInt(chainId as string) || 0,
    displayAddress ?? '',
    '0',
    true
  );

  if (isLoading) {
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

  const { txs, receipts, oldReceipts, isFirstPage, isLastPage } =
    transactionData;
  const receipt = receipts[receipts.length - 1];
  const blockNumber = String(parseInt(receipt.blockNumber.slice(2), 16));

  const renderContent = () => {
    if (displayAddress) {
      switch (activeTab) {
        case 'tokentxns':
          return <AddressTokenTransfer />;
        case 'nfttransfers':
          return <AddressNftTransfer />;
        default:
          return (
            <AddressLists
              address={displayAddress}
              chain={chain}
              txs={txs}
              receipts={receipts}
              isFirstPage={isFirstPage}
              isLastPage={isLastPage}
              blockNumber={blockNumber}
              pages={pages}
            />
          );
      }
    }
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 my-4">
      <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
        <h1 className="text-2xl font-bold">Address</h1>
        {txs.length > 0 ? (
          <>
            <span>{displayAddress}</span>
            <ClipboardButton text={displayAddress ?? ''} />
            <QrcodeDialog text={displayAddress ?? ''} />
          </>
        ) : (
          <span>(Invalid Address)</span>
        )}
      </div>
      <hr className="opacity-75 my-3" />
      <div className="flex sm:flex-row flex-col gap-3 w-full">
        <AddressOverview chain={chain} address={displayAddress ?? ''} />
        <AddressMoreInfo
          address={displayAddress!}
          chainId={chain?.id}
          receipts={receipts}
          oldReceipts={oldReceipts}
        />
        <AddressMultiChain />
      </div>
      <AddressTab
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={tabs}
      />
      <div className="flex w-full my-3">{renderContent()}</div>
    </div>
  );
};

export default AddressPage;
