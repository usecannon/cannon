import { ExtendedTransactionReceipt } from '@/types/ExtendedTransactionReceipt';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { tabs, TabId } from '@/features/Txn/TransactionPage';

type TransactionTabProps = {
  activeTab: string;
  setActiveTab: (tabId: TabId) => void;
  txReceipt: ExtendedTransactionReceipt;
};

const TransactionTab: React.FC<TransactionTabProps> = ({
  activeTab,
  setActiveTab,
  txReceipt,
}) => {
  const router = useRouter();

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

  return (
    <>
      <ul className="flex space-x-2 mt-3">
        {tabs
          .filter((tab) => {
            if (tab.id === 'eventlog') {
              return txReceipt.logs.length > 0;
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
                ? `${tab.label} (${txReceipt.logs.length})`
                : tab.label}
            </li>
          ))}
      </ul>
    </>
  );
};

export default TransactionTab;
