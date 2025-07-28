import React from 'react';
import { Download } from 'lucide-react';
import { handleDownloadCsv } from '@/lib/address';
import { Chain } from '@/types/Chain';
import {
  OtterscanTransaction,
  OtterscanReceipt,
  NftTokenType,
  TokenTransferType,
} from '@/types/AddressList';
import { TabId } from '@/lib/address';

type DownloadListButtonProps = {
  txs: OtterscanTransaction[];
  receipts: OtterscanReceipt[];
  chain: Chain;
  fileName: string;
  activeTab: TabId;
  nftTransfers?: NftTokenType[];
  tokenTransfers?: TokenTransferType[];
};

const DownloadListButton: React.FC<DownloadListButtonProps> = ({
  txs,
  receipts,
  chain,
  fileName,
  activeTab,
  nftTransfers = [],
  tokenTransfers = [],
}) => {
  return (
    <div>
      <button
        onClick={() =>
          handleDownloadCsv(
            activeTab,
            txs,
            receipts,
            chain,
            fileName,
            tokenTransfers,
            nftTransfers
          )
        }
        className="inline-flex items-center px-3 py-1 text-xs border border-gray-500 text-gray-300 rounded hover:bg-gray-700"
      >
        <Download className="mr-2 h-4 w-4" />
        Download Page Data
      </button>
    </div>
  );
};

export default DownloadListButton;
