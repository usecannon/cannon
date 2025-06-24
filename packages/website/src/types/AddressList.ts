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

export type TokenTransferRow = {
  detail: string;
  hash: string;
  method: string;
  blockNumber: string;
  age: number | undefined;
  from: string;
  to: string;
  amount: string;
  contractAddress: string | null | undefined;
};

export type NftTransferRow = {
  detail: string;
  hash: string;
  method: string;
  blockNumber: string;
  age: number | undefined;
  from: string;
  to: string;
  type: string;
  contractAddress: string | null | undefined;
};