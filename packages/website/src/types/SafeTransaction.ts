import { Address, Hex } from 'viem';

export type SafeTransaction = {
  to: Address;
  value: string;
  data: Hex;
  operation: string;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: Address;
  refundReceiver: Address;
  _nonce: number;
  transactionHash?: string;
  safeTxHash?: string;
  submissionDate?: string;
  confirmationsRequired?: number;
  confirmedSigners?: Address[];
};
