import React from 'react';
import { convertToFormatEther } from '@/lib/transaction';

type AmountColumnProps = {
  info: any;
  symbol: string;
};

const AmountColumn: React.FC<AmountColumnProps> = ({ info, symbol }) => {
  return (
    <span>
      {String(convertToFormatEther(info.getValue(), symbol) ?? '0 ETH')}
    </span>
  );
};

export default AmountColumn;
