import { useState, useEffect } from 'react';
import { Hash, createPublicClient, http } from 'viem';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { useRouter } from 'next/router';
import TransactionAction from '@/features/Txn/TransactionAction';
import TransactionOverview from '@/features/Txn/TransactionOverview';
import TransactionDetail from '@/features/Txn/TransactionDetail';
import TransactionEventLog from '@/features/Txn/TransactionEventLog';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'eventlog', label: 'Logs' },
] as const;

type TabId = (typeof tabs)[number]['id'];

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

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');

    if (hash === 'eventlog') {
      setActiveTab(hash as TabId);
    } else {
      setActiveTab('overview');
    }
  }, [router.asPath]);

  const handleTabClick = (tabId: TabId) => {
    if (tabId === 'overview') {
      history.pushState(null, '', router.asPath.split('#')[0]);
    } else {
      window.location.hash = tabId;
    }
    setActiveTab(tabId);
  };

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
          <hr className="mt-3" />
          <div className="mt-3 ml-3">
            <ul className="flex space-x-2 mt-3">
              {tabs
                .filter((tab) => {
                  if (tab.id === 'eventlog') {
                    return txnReceipt.logs.length > 0;
                  }
                  return true;
                })
                .map((tab) => (
                  <li
                    key={tab.id}
                    className={`pb-2 cursor-pointer ${
                      activeTab === tab.id
                        ? 'px-2 py-1 font-bold text-xs text-white border border-gray-600 bg-gray-600 rounded-lg'
                        : 'px-2 py-1 text-xs font-semibold text-gray-200 border border-gray-800 bg-gray-800 rounded-lg flex items-center'
                    }`}
                    onClick={() => handleTabClick(tab.id)}
                  >
                    {tab.id === 'eventlog'
                      ? `${tab.label} (${txnReceipt.logs.length})`
                      : tab.label}
                  </li>
                ))}
            </ul>
          </div>

          <div className="w-full px-4 mt-3">{renderContent()}</div>
        </div>
      )}
    </>
  );
}
