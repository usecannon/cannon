import { GetTransactionReceiptReturnType } from "viem";

type L2ReceiptExtension = {
  l1BaseFeeScalar?: string;
  l1BlobBaseFee?: string;
  l1BlobBaseFeeScalar?: string;
  l1Fee?: bigint;
  l1GasPrice?: bigint;
  l1GasUsed?: bigint;
  l1FeeScalar?: bigint;
};

export type ExtendedTransactionReceipt = GetTransactionReceiptReturnType &
  Partial<L2ReceiptExtension>;
