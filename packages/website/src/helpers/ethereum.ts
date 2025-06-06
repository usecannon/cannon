import MulticallABI from '@/abi/Multicall.json';
import { Abi } from 'abitype';
import { EIP7412 } from 'erc7412';
import { PythAdapter } from 'erc7412/dist/src/adapters/pyth';
import {
  Address,
  decodeFunctionResult,
  encodeFunctionData,
  Hex,
  PublicClient,
  TransactionRequestBase,
  WalletClient,
  zeroAddress,
} from 'viem';

async function generate7412CompatibleCall(
  client: PublicClient,
  from: Address,
  txn: Partial<TransactionRequestBase>,
  pythUrl: string
) {
  const converter = new EIP7412([new PythAdapter(pythUrl)], createMakeMulticall(from) as any); // TODO: fix type
  return await converter.enableERC7412(client as any, txn as any); // TODO: fix type
}

function createMakeMulticall(from: Address) {
  return (
    txns: Partial<TransactionRequestBase>[]
  ): {
    operation: string;
    account: Address;
    to: Address;
    value: bigint;
    data: Hex;
  } => {
    const totalValue = txns.reduce((val, txn) => {
      return val + (txn.value || BigInt(0));
    }, BigInt(0));

    return {
      operation: '1', // multicall is a DELEGATECALL
      account: from,
      to: '0xE2C5658cC5C448B48141168f3e475dF8f65A1e3e',
      value: totalValue,
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
  };
}

export async function contractCall(
  from: Address,
  to: Address,
  functionName: string,
  params: any,
  value: bigint,
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
    account: from,
    to,
    value,
    data,
  };

  let call;
  let res;
  try {
    call = await generate7412CompatibleCall(publicClient, from, txn, pythUrl);
    res = await publicClient.call({ ...call, account: from });
  } catch (e) {
    /**
     * If we fail to generate an EIP7412 compatible call we default to simulateContract
     * because the multicall txn doesnt return error data when it fails
     * We default simulateContract because behaves almost exactly like readContract, but uses abi-encoded data
     */
    res = await publicClient.simulateContract({ address: to, abi, functionName, args: params, account: from, value });
  }

  try {
    // Attempt to decode the multicall response such that we can return the last return value
    // ERC-7412 is causing there to be items prepended to the list from the oracle contract calls
    const multicallValue: any = (res as any).data
      ? decodeFunctionResult({
          abi: MulticallABI,
          functionName: 'aggregate3Value',
          data: (res as any).data as any,
        })
      : (res as any).data;
    if (Array.isArray(multicallValue) && multicallValue[multicallValue.length - 1].success) {
      return (res as any).data
        ? decodeFunctionResult({
            abi,
            functionName,
            data: multicallValue[multicallValue.length - 1].returnData as any,
          })
        : (res as any).data;
    } else {
      return (res as any).data
        ? decodeFunctionResult({
            abi,
            functionName,
            data: (res as any).data as any,
          })
        : (res as any).data;
    }
  } catch (e) {
    // We land here if the call is not a multicall
    return (res as any).data
      ? decodeFunctionResult({
          abi,
          functionName,
          data: (res as any).data as any,
        })
      : (res as any).data;
  }
}

export async function contractTransaction(
  from: Address,
  to: Address,
  value: bigint,
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
    value,
  };

  let call;
  try {
    call = await generate7412CompatibleCall(publicClient, from, txn, pythUrl);
  } catch (e) {
    // do nothing
  }

  /**
   * If we fail to generate an EIP7412 compatible call we default to the regular function params
   * because the multicall txn doesnt return error data to decode when it fails
   */
  const hash = await walletClient.sendTransaction({
    chain: publicClient.chain!,
    account: from,
    to: call?.to || to,
    data: call?.data || data,
    value: call?.value || value,
  });

  return hash;
}
/**
 * Truncate an address to a given length
 * @param address The address to truncate
 * @param length The length to truncate to
 * @returns The truncated address
 * @example
 * truncateAddress('0x1234567890abcdef1234567890abcdef12345678') // '0x123456...12345678'
 */
export const truncateAddress = (address: string, length = 6) => {
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`;
};

/**
 * Check if a string is a valid hex string
 * @param data The string to check
 * @returns Whether the string is a valid hex string
 */
export const isValidHex = (data: string) => {
  return data ? data.startsWith('0x') && data.length % 2 === 0 && /^[0-9a-fA-F]*$/.test(data.slice(2)) : false;
};
