import { Address, decodeFunctionResult, encodeFunctionData, Hex, TransactionRequestBase, zeroAddress } from 'viem';
import { PublicClient, WalletClient } from 'wagmi';
import { Abi } from 'abitype/src/abi';
import { EIP7412 } from 'erc7412';
import { PythAdapter } from 'erc7412/dist/src/adapters/pyth';
import MulticallABI from '@/abi/Multicall.json';

async function generate7412CompatibleCall(client: PublicClient, txn: Partial<TransactionRequestBase>, pythUrl: string) {
  const converter = new EIP7412([new PythAdapter(pythUrl)], makeMulticall);
  return await converter.enableERC7412(client as any, txn);
}

function makeMulticall(txns: Partial<TransactionRequestBase>[]): {
  operation: string;
  to: Address;
  value: bigint;
  data: Hex;
} {
  let totalValue = BigInt(0);
  for (const txn of txns) {
    totalValue = totalValue + (txn.value || BigInt(0));
  }

  return {
    operation: '1', // multicall is a DELEGATECALL
    to: '0xae788aaf52780741e12bf79ad684b91bb0ef4d92',
    value: totalValue,
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

export async function contractCall(
  to: Address,
  functionName: string,
  params: any,
  abi: Abi,
  publicClient: PublicClient,
  pythUrl: string
) {
  const data = encodeFunctionData({
    abi,
    functionName,
    args: Array.isArray(params) ? params : [params],
  });
  const txn = {
    to,
    data,
  };
  const call = await generate7412CompatibleCall(publicClient, txn, pythUrl);
  const res = await publicClient.call({ ...call, account: zeroAddress });
  try {
    const multicallValue: any = decodeFunctionResult({
      abi: MulticallABI,
      functionName: 'aggregate3Value',
      data: (res as any).data as any,
    });
    if (Array.isArray(multicallValue) && multicallValue[multicallValue.length - 1].success) {
      return decodeFunctionResult({
        abi,
        functionName,
        data: multicallValue[multicallValue.length - 1].returnData as any,
      });
    } else {
      return decodeFunctionResult({
        abi,
        functionName,
        data: (res as any).data as any,
      });
    }
  } catch {
    return decodeFunctionResult({
      abi,
      functionName,
      data: (res as any).data as any,
    });
  }
}

export async function contractTransaction(
  from: Address,
  to: Address,
  functionName: string,
  params: any,
  abi: Abi,
  publicClient: PublicClient,
  walletClient: WalletClient,
  pythUrl: string
) {
  const data = encodeFunctionData({
    abi,
    functionName,
    args: Array.isArray(params) ? params : [params],
  });
  const txn = {
    account: from,
    to,
    data,
  };
  const call = await generate7412CompatibleCall(publicClient, txn, pythUrl);
  const hash = await walletClient.sendTransaction({
    account: from,
    to: call.to,
    data: call.data,
    value: call.value,
  });
  return hash;
}
