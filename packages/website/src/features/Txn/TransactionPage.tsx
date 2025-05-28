import { useState, useEffect } from 'react';
import { Hash, createPublicClient, http } from 'viem';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { useRouter } from 'next/router';
import TransactionAction from '@/features/Txn/TransactionAction';
import TransactionOverview from '@/features/Txn/TransactionOverview';
import TransactionDetail from '@/features/Txn/TransactionDetail';
import TransactionEventLog from '@/features/Txn/TransactionEventLog';
import TransactionTab from '@/features/Txn/TransactionTab';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'eventlog', label: 'Logs' },
] as const;

export type TabId = (typeof tabs)[number]['id'];

export default function TransactionPage() {
  const router = useRouter();
  const { chainId, txHash } = router.query;
  const [tx, setTx] = useState<any>(null);
  const [txReceipt, setTxReceipt] = useState<any>(null);
  const [txBlock, setTxBlock] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [errorFlag, setErrorFlag] = useState<boolean>(false);
  const [latestBlockNumber, setLatestBlockNumber] = useState<bigint>(0n);

  const { getChainById } = useCannonChains();
  const chain = getChainById(Number(chainId));

  if (!chain) throw new Error(`Chain ${chainId} not found`);

  const publicClient = createPublicClient({
    chain,
    transport: http(chain?.rpcUrls.default.http[0]),
  });

  useEffect(() => {
    const fetchStatus = async (transactionHash: Hash | undefined) => {
      try {
        if (transactionHash) {
          const tx = await publicClient.getTransaction({
            hash: transactionHash,
          });
          const receipt = await publicClient.getTransactionReceipt({
            hash: transactionHash,
          });
          const block = await publicClient.getBlock({
            blockNumber: receipt.blockNumber,
          });

          const blockNumber = await publicClient.getBlockNumber();

          setTxReceipt(receipt);
          setTx(tx);
          setTxBlock(block);
          setLatestBlockNumber(blockNumber);
          // console.log(tx);
          // console.log(receipt);
          // console.log(block);
        }
      } catch (err) {
        console.error('Transaction Error', err);
        setErrorFlag(true);
      }
    };

    if (typeof txHash === 'string' && txHash.startsWith('0x')) {
      void fetchStatus(txHash as Hash);
    }
  }, [chainId, txHash]);

  const renderContent = () => {
    switch (activeTab) {
      case 'eventlog':
        return <TransactionEventLog tx={tx} txReceipt={txReceipt} />;
      default:
        return (
          <>
            <TransactionAction tx={tx} txReceipt={txReceipt} chain={chain} />

            <TransactionOverview
              tx={tx}
              txReceipt={txReceipt}
              txBlock={txBlock}
              chain={chain}
              latestBlockNumber={latestBlockNumber}
            />

            <TransactionDetail
              tx={tx}
              txReceipt={txReceipt}
              txBlock={txBlock}
              chain={chain}
            />
          </>
        );
    }
  };

  return errorFlag ? (
    <div className="w-full max-w-screen-lg mx-auto px-4 mt-3">
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load transaction data. Please check the transaction hash or
          try again later.
        </AlertDescription>
      </Alert>
    </div>
  ) : (
    <>
      {tx && txReceipt && txBlock && (
        <div className="w-full max-w-screen-lg mx-auto px-4">
          <div className="ml-3">
            <h1 className="text-2xl font-bold mt-4">Transaction Details</h1>
          </div>
          <hr className="opacity-75 mt-3" />
          <TransactionTab
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            txReceipt={txReceipt}
          />
          <div className="w-full mt-3">{renderContent()}</div>
        </div>
      )}
    </>
  );
}
