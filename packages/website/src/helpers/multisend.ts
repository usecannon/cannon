import { Address, encodeFunctionData, Hex, TransactionRequestBase, zeroAddress } from 'viem';
import MulticallABI from '@/abi/Multicall.json';

const MULTICALL_ADDRESS = '0xE2C5658cC5C448B48141168f3e475dF8f65A1e3e';

export function makeMultisend(txns: Partial<TransactionRequestBase>[]): {
  operation: string;
  to: Address;
  value: string;
  data: Hex;
} {
  const totalValue = txns.reduce((val, txn) => val + (txn.value || BigInt(0)), BigInt(0));

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
          requireSuccess: true,
        })),
      ],
    }),
  };
}
