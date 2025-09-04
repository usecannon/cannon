import React from 'react';
import Link from 'next/link';
import { ClipboardButton } from '@/components/ClipboardButton';

type HashColumnProps = {
  info: any;
  chainId: number;
};

const HashColumn: React.FC<HashColumnProps> = ({ info, chainId }) => {
  const transactionHash = info.getValue();
  return (
    <div className="flex items-center space-x-2">
      <Link
        href={`/tx/${chainId}/${transactionHash}`}
        className="flex items-center font-mono border-b border-dotted border-muted-foreground hover:border-solid"
      >
        <span className="font-mono">{`${transactionHash.slice(
          0,
          12
        )}...`}</span>
      </Link>
      <ClipboardButton text={transactionHash} />
    </div>
  );
};

export default HashColumn;
