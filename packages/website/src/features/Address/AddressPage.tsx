import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ClipboardButton } from '@/components/ClipboardButton';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { createPublicClient, http } from 'viem';
import { formatEther } from 'viem';
import AddressTab from '@/features/Address/AddressTab';
import QrcodeDialog from '@/components/QrcodeDialog';
import AddressOverview from '@/features/Address/AddressOverview';
import AddressMoreInfo from '@/features/Address/AddressMoreInfo';
import AddressMultiChain from '@/features/Address/AddressMultiChain';
import AddressLists from '@/features/Address/AddressTxLists';
import AddressTokenTransfer from '@/features/Address/AddressTokenTransfer';
import AddressNftTransfer from '@/features/Address/AddressNftTransfer';
import { transactions, afterTx } from './addressDemoData';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const afterTxs = afterTx.result;

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const estimatedBalance = await publicClient.getBalance({
          address: addressStr!,
        });
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
          return (
            <AddressTokenTransfer
              address={addressStr!}
              txs={txs}
              receipts={receipts}
              chain={chain}
            />
          );
        case 'nfttransfers':
          return (
            <AddressNftTransfer
              address={addressStr!}
              txs={txs}
              receipts={receipts}
              chain={chain}
            />
          );
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
      <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
        <h1 className="text-2xl font-bold">Address</h1>
        <span>{addressStr}</span>
        <Tooltip>
          <TooltipTrigger>
            <ClipboardButton text={addressStr ?? ''} />
          </TooltipTrigger>
          <TooltipContent>Copy Address</TooltipContent>
        </Tooltip>
        <QrcodeDialog text={addressStr ?? ''} />
      </div>
      <hr className="opacity-75 my-3" />
      <div className="flex sm:flex-row flex-col gap-3 w-full">
        <AddressOverview
          symbol={chain?.nativeCurrency.symbol}
          balance={balance}
        />
        <AddressMoreInfo
          address={addressStr!}
          chainId={chain?.id}
          receipts={receipts}
          afterTxs={afterTxs}
        />
        <AddressMultiChain />
      </div>
      <AddressTab activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex w-full my-3">{renderContent()}</div>
    </div>
  );
};

export default AddressPage;
