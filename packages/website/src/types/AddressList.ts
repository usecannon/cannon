export type TransactionRow = {
  detail: string;
  hash: string;
  blockNumber: string;
  from: string;
  to: string;
  age: number | undefined;
  method: string;
  amount: string;
  txnFee: string;
  gasPrice: string;
  contractAddress: string | null | undefined;
};

export type TransactionCsvRow = {
  hash: string;
  status: string;
  method: string;
  blockNumber: string;
  dateTime: string;
  from: string;
  to: string;
  amount: string;
  txnFee: string;
};

export type OtterscanTransaction = {
  blockHash: string;
  blockNumber: string;
  from: string;
  gas: string;
  gasPrice: string;
  maxPriorityFeePerGas: string;
  maxFeePerGas: string;
  hash: string;
  input: string;
  nonce: string;
  to: string | null;
  transactionIndex: string;
  value: string;
  type: string;
  accessList: any[];
  chainId: string;
  v: string;
  yParity: string;
  r: string;
  s: string;
  method?: string;
};

export type OtterscanReceipt = {
  blockHash: string;
  blockNumber: string;
  contractAddress: string | null;
  cumulativeGasUsed: string;
  effectiveGasPrice: string;
  from: string;
  gasUsed: string;
  logs: any[];
  logsBloom: string;
  status: string;
  timestamp: number;
  to: string | null;
  transactionHash: string;
  transactionIndex: string;
  type: string;
};
