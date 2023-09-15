import { SafeTransaction } from './SafeTransaction';

export type StagedTransaction = {
  txn: SafeTransaction;
  sigs: string[];
};
