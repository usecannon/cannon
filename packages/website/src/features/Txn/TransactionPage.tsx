import { useState, useEffect } from 'react';
import { Hash, createPublicClient, http } from 'viem';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { useRouter } from 'next/router';
import TransactionAction from '@/features/Txn/TransactionAction';
import TransactionOverview from '@/features/Txn/TransactionOverview';
import TransactionDetail from '@/features/Txn/TransactionDetail';
import TransactionEventLog from '@/features/Txn/TransactionEventLog';
import TransactionTab from '@/features/Txn/TransactionTab';

export const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'eventlog', label: 'Logs' },
] as const;

export type TabId = (typeof tabs)[number]['id'];

export default function TransactionPage() {
  const router = useRouter();
  const { chainId, txHash } = router.query;
  const [txn, setTxn] = useState<any>(null);
  const [txnReceipt, setTxnReceipt] = useState<any>(null);
  const [txnBlock, setTxnBlock] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { getChainById, getExplorerUrl } = useCannonChains();
  const chain = getChainById(Number(chainId));

  const publicClient = createPublicClient({
    chain,
    transport: http(chain?.rpcUrls.default.http[0]),
  });

  useEffect(() => {
    const fetchStatus = async (transactionHash: Hash | undefined) => {
      if (transactionHash) {
        const receipt = await publicClient.getTransactionReceipt({
          hash: transactionHash,
        });
        const tx = await publicClient.getTransaction({ hash: transactionHash });
        const block = await publicClient.getBlock({
          blockNumber: receipt.blockNumber,
        });

        setTxnReceipt(receipt);
        setTxn(tx);
        setTxnBlock(block);
        console.log(receipt);
        // console.log(tx);
        // console.log(block);
      }
    };

    if (typeof txHash === 'string' && txHash.startsWith('0x')) {
      void fetchStatus(txHash as Hash);
    }
  }, [chainId, txHash]);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <TransactionAction tx={txn} txReceipt={txnReceipt} chain={chain} />

            <TransactionOverview
              tx={txn}
              txReceipt={txnReceipt}
              txBlock={txnBlock}
              chain={chain}
              getExplorerUrl={getExplorerUrl}
            />

            <TransactionDetail
              tx={txn}
              txReceipt={txnReceipt}
              txBlock={txnBlock}
              chain={chain}
            />
          </>
        );
      case 'eventlog':
        return (
          <TransactionEventLog
            tx={txn}
            txReceipt={txnReceipt}
            getExplorerUrl={getExplorerUrl}
          />
        );
      default:
        return <div>Default tag</div>;
    }
  };

  return (
    <>
      {txn && txnReceipt && txnBlock && (
        <div className="w-full max-w-screen-lg mx-auto px-4">
          <div className="ml-3">
            <h1 className="text-2xl font-bold mt-4">Transaction Details</h1>
          </div>
          <hr className="opacity-75 mt-3" />
          <TransactionTab
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            txReceipt={txnReceipt}
          />
          <div className="w-full mt-3">{renderContent()}</div>
        </div>
      )}
    </>
  );
}
