export type TransactionMethod = {
  type: string;
  name: string;
  selector: string;
  contractName?: string;
  chainId?: number;
  address?: string;
  packageName?: string;
  preset?: string;
  version?: string;
};

export type ExtendedTransactionMethod = Record<string, TransactionMethod[]>;
