import React, { useEffect } from 'react';
import { TabId } from '@/lib/address';
import { useRouter } from 'next/router';

type AddressTabProps = {
  activeTab: TabId;
  setActiveTab: (tabId: TabId) => void;
  tabs: { id: TabId; label: string }[];
};

const AddressTab: React.FC<AddressTabProps> = ({
  activeTab,
  setActiveTab,
  tabs,
}) => {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    const tabList = tabs.map((tab) => tab.id);

    if (tabList.includes(hash)) {
      setActiveTab(hash as TabId);
    } else {
      setActiveTab('transactions');
    }
  }, [router.asPath]);

  const handleTabClick = (tabId: TabId) => {
    if (tabId === 'transactions') {
      history.pushState(null, '', router.asPath.split('#')[0]);
    } else {
      window.location.hash = tabId;
    }
    setActiveTab(tabId);
  };

  return (
    <>
      <ul className="flex space-x-2 mt-3 overflow-x-auto whitespace-nowrap no-scrollbar">
        {tabs.map((tab) => (
          <li
            key={tab.id}
            className={`cursor-pointer ${
              activeTab === tab.id
                ? 'px-2 py-1 font-bold text-xs text-white border border-gray-600 bg-gray-600 rounded-lg'
                : 'px-2 py-1 text-xs font-semibold text-gray-200 border border-gray-800 bg-gray-800 rounded-lg flex items-center'
            }`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
          </li>
        ))}
      </ul>
    </>
  );
};

export default AddressTab;
