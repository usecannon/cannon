import React from 'react';
import { transactions, afterTx } from './addressDemoData';

const erc20Hash =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const AddressTokenTransfer = () => {
  const txs = transactions.result.txs;
  const receipts = transactions.result.receipts;
  console.log(`receipt length : ${receipts.length}`);

  const receiptss = receipts.filter((receipt) => {
    if (receipt.logs.length > 0 && receipt.logs[0].topics[0] === erc20Hash) {
      //   const flag = receipt.logs.find((log) => log.topics[0] === erc20Hash);
      //   return flag;
      return true;
    }
  });
  console.log(`edited receipt length : ${receiptss.length}`);
  console.log(receiptss);

  return <div>test</div>;
};

export default AddressTokenTransfer;
