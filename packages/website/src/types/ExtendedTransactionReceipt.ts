import { GetTransactionReceiptReturnType } from 'viem';

type L2ReceiptExtension = {
  l1BaseFeeScalar?: string;
  l1BlobBaseFee?: string;
  l1BlobBaseFeeScalar?: string;
  l1Fee?: bigint | string;
  l1GasPrice?: bigint | string;
  l1GasUsed?: bigint | string;
  l1FeeScalar?: bigint | string;
};

export type ExtendedTransactionReceipt = GetTransactionReceiptReturnType & Partial<L2ReceiptExtension>;
