import React from 'react';
import { formatGwei } from 'viem';

type TxFeeColumnProps = {
  info: any;
  isGasPrice: boolean;
};

const TxFeeColumn: React.FC<TxFeeColumnProps> = ({ info, isGasPrice }) => {
  const txnFee = info.getValue();
  const gasPrice = info.row.getValue('gasPrice');
  return (
    <span>
      {isGasPrice ? formatGwei(BigInt(gasPrice)).toLocaleString() : txnFee}
    </span>
  );
};

export default TxFeeColumn;
