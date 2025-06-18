import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ClipboardButton } from '@/components/ClipboardButton';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { createPublicClient, http } from 'viem';
import { formatEther } from 'viem';
import AddressTabProps from '@/features/Address/AddressTab';
import QrcodeDialog from '@/components/QrcodeDialog';
import AddressOverview from '@/features/Address/AddressOverview';
import AddressMoreInfo from '@/features/Address/AddressMoreInfo';
import AddressMultiChain from '@/features/Address/AddressMultiChain';
import AddressLists from '@/features/Address/AddressLists';
import AddressTokenTransfer from '@/features/Address/AddressTokenTransfer';
import { transactions, afterTx } from './addressDemoData';

export function covertToDec(value: bigint | string): bigint {
  return typeof value === 'string'
    ? BigInt(parseInt(value.slice(2), 16))
    : value;
}

export function convertToFormatEther(
  value: bigint | string,
  symbol: string | undefined
): string {
  return `${formatEther(covertToDec(value)).toLocaleString()} ${symbol}`;
}

export const tabs = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'tokentxns', label: 'Token Transfers (ERC-20)' },
  { id: 'nfttransfers', label: 'NFT Transfers' },
  { id: 'events', label: 'Events' },
] as const;

export type TabId = (typeof tabs)[number]['id'];

const AddressPage = () => {
  const router = useRouter();
  const { chainId, address } = router.query;
  const [balance, setBalance] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabId>('transactions');
  const { getChainById } = useCannonChains();
  const chain = getChainById(Number(chainId));
  const publicClient = createPublicClient({
    chain,
    transport: http(chain?.rpcUrls.default.http[0]),
  });
  const addressStr = Array.isArray(address) ? address[0] : address;
  // Get demo transaction data
  const txs = transactions.result.txs;
  const receipts = transactions.result.receipts;
  const txAfter = afterTx.result.txs;

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        // console.log(`Fetching balance for ${addressStr}`);
        const estimatedBalance = await publicClient.getBalance({
          address: addressStr!,
        });
        // console.log(`Balance: ${String(estimatedBalance)}`);
        setBalance(
          convertToFormatEther(estimatedBalance, chain?.nativeCurrency.symbol)
        );
      } catch (error) {
        console.error('getBalance error:', error);
      }
    };

    fetchBalance();
  }, [address]);

  const renderContent = () => {
    if (addressStr) {
      switch (activeTab) {
        case 'tokentxns':
          return <AddressTokenTransfer />;
        default:
          return (
            <AddressLists
              address={addressStr}
              chain={chain}
              txs={txs}
              receipts={receipts}
            />
          );
      }
    }
  };

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 my-4">
      <div className="flex items-baseline space-x-4">
        <h1 className="text-2xl font-bold">Address</h1>
        <span className="">0xE0707EB3a3f115Be661B2ABFb73b511C61301554</span>
        <ClipboardButton text="" />
        <QrcodeDialog />
      </div>
      <hr className="opacity-75 my-3" />
      <div className="flex sm:flex-row flex-col gap-3">
        <AddressOverview
          symbol={chain?.nativeCurrency.symbol}
          balance={balance}
        />
        <AddressMoreInfo chainId={chain?.id} />
        <AddressMultiChain />
      </div>
      <AddressTabProps activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex w-full my-3">{renderContent()}</div>
    </div>
  );
};

export default AddressPage;
