import * as viem from 'viem';
import MulticallABI from './abis/Multicall';

const MULTICALL_ADDRESS = '0xE2C5658cC5C448B48141168f3e475dF8f65A1e3e';

export interface TxData {
  abi: viem.Abi;
  address: viem.Address;
  functionName: string;
  value?: string | bigint | number;
  args?: any[];
}

export function prepareMulticall(txns: TxData[]) {
  const value = txns.reduce((val, txn) => {
    return val + (BigInt(txn.value || 0) || BigInt(0));
  }, BigInt(0));

  return {
    abi: MulticallABI,
    address: MULTICALL_ADDRESS,
    functionName: 'aggregate3Value',
    value,
    args: [
      txns.map((txn) => ({
        target: txn.address || viem.zeroAddress,
        callData: viem.encodeFunctionData(txn as any),
        value: txn.value || '0',
        requireSuccess: true,
      })),
    ],
  };
}
