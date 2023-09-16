import { Address, encodeFunctionData, Hex, TransactionRequestBase, zeroAddress } from 'viem';
import MulticallABI from '@/abi/Multicall.json';

const MULTICALL_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

export function makeMultisend(txns: Partial<TransactionRequestBase>[]): {
  operation: string;
  to: Address;
  value: string;
  data: Hex;
} {
  let totalValue = BigInt(0);
  for (const txn of txns) {
    totalValue = totalValue + (txn.value || BigInt(0));
  }

  return {
    operation: '1', // multicall is a DELEGATECALL
    to: MULTICALL_ADDRESS,
    value: totalValue.toString(),
    data: encodeFunctionData({
      abi: MulticallABI,
      functionName: 'aggregate3Value',
      args: [
        txns.map((txn) => ({
          target: txn.to || zeroAddress,
          callData: txn.data || '0x',
          value: txn.value || '0',
          allowFailure: false,
        })),
      ],
    }),
  };
}
