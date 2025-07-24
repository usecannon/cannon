import React, { useState } from 'react';
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

export const tabs = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'tokentxns', label: 'Token Transfers (ERC-20)' },
  { id: 'nfttransfers', label: 'NFT Transfers' },
];

export type TabId = (typeof tabs)[number]['id'];

const AddressPage = () => {
  const router = useRouter();
  const { chainId, address } = router.query;
  const [activeTab, setActiveTab] = useState<TabId>('transactions');
  const { getChainById } = useCannonChains();
  const chain = getChainById(Number(chainId));
  const displayAddress = Array.isArray(address) ? address[0] : address;
  const { data, isLoading, isError } = useAddressTransactions(
    displayAddress ?? ''
  );
  if (isLoading) return null;

  if (isError || !data) {
    return (
      <div className="w-full max-w-screen-xl mx-auto px-4 mt-3">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load transaction data. Please check the transaction hash
            or try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { txs, receipts, oldReceipts } = data;

  const renderContent = () => {
    if (displayAddress) {
      switch (activeTab) {
        case 'tokentxns':
          return (
            <AddressTokenTransfer
              address={displayAddress!}
              txs={txs}
              receipts={receipts}
              chain={chain}
            />
          );
        case 'nfttransfers':
          return (
            <AddressNftTransfer
              address={displayAddress!}
              txs={txs}
              receipts={receipts}
              chain={chain}
            />
          );
        default:
          return (
            <AddressLists
              address={displayAddress}
              chain={chain}
              txs={txs}
              receipts={receipts}
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
