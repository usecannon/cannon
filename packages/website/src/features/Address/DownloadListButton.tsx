import React from 'react';
import { Download } from 'lucide-react';
import { handleDownload } from '@/lib/address';
import { Chain } from '@/types/Chain';

type DownloadListButtonProps = {
  txs: any[];
  receipts: any[];
  names: any;
  chain: Chain;
  fileName: string;
};

const DownloadListButton: React.FC<DownloadListButtonProps> = ({
  txs,
  receipts,
  names,
  chain,
  fileName,
}) => {
  return (
    <div>
      <button
        onClick={() => handleDownload(txs, receipts, names, chain, fileName)}
        className="inline-flex items-center px-3 py-1 text-xs border border-gray-500 text-gray-300 rounded hover:bg-gray-700"
      >
        <Download className="mr-2 h-4 w-4" />
        Download Page Data
      </button>
    </div>
  );
};

export default DownloadListButton;
