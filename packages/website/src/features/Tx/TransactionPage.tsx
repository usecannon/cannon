import { useState } from 'react';
import { useRouter } from 'next/router';
import TransactionAction from '@/features/Tx/TransactionAction';
import TransactionOverview from '@/features/Tx/TransactionOverview';
import TransactionDetail from '@/features/Tx/TransactionDetail';
import TransactionEventLog from '@/features/Tx/TransactionEventLog';
import TransactionTab from '@/features/Tx/TransactionTab';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTransactionDetails } from '@/hooks/useTransactionDetail';

export const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'eventlog', label: 'Logs' },
] as const;

export type TabId = (typeof tabs)[number]['id'];

export default function TransactionPage() {
  const router = useRouter();
  const { chainId, txHash } = router.query;
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [hoverId, setHoverId] = useState<string>('');
  const { data, isLoading, isError, error } = useTransactionDetails(chainId, txHash);

  if (isLoading) return null;

  if (isError || !data) {
    console.log('not rendering transaction because', error, data);
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

  const { tx, txReceipt, txBlock, chain, latestBlockNumber, txNames } = data;
  const renderContent = () => {
    switch (activeTab) {
      case 'eventlog':
        return (
          <TransactionEventLog
            tx={tx}
            txReceipt={txReceipt}
            txNames={txNames}
            hoverId={hoverId}
            setHoverId={setHoverId}
          />
        );
      default:
        return (
          <>
            <TransactionAction
              tx={tx}
              txReceipt={txReceipt}
              chain={chain}
              txNames={txNames}
              hoverId={hoverId}
              setHoverId={setHoverId}
            />

            <TransactionOverview
              tx={tx}
              txReceipt={txReceipt}
              txBlock={txBlock}
              chain={chain}
              latestBlockNumber={latestBlockNumber}
              hoverId={hoverId}
              setHoverId={setHoverId}
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

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4">
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
  );
}
