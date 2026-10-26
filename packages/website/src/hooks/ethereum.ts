import { useCallback } from 'react';
import { contractCall, contractTransaction } from '@/helpers/ethereum';
import { useStore } from '@/helpers/store';
import { useLogs } from '@/providers/logsProvider';
import { Abi } from 'abitype';
import { Address, PublicClient, WalletClient } from 'viem';

export function useContractCall(
  to: Address,
  functionName: string,
  params: any,
  value: bigint,
  abi: Abi,
  publicClient: PublicClient,
) {
  const settings = useStore((s) => s.settings);
  const { addLog } = useLogs();

  return useCallback(
    (from: Address) =>
      contractCall(from, to, functionName, params, value, abi, publicClient, settings.pythUrl)
        .then((result) => {
          addLog('info', `Querying ${to} (Chain ID ${publicClient.chain!.id}): ${functionName}(${params})`);
          return { value: result, error: null };
        })
        .catch((error) => {
          addLog('error', `Error querying ${to}: ${functionName}(${params})`);
          return { value: null, error: error as Error };
        }),
    [to, functionName, params, value, abi, publicClient, settings.pythUrl, addLog],
  );
}

export function useContractTransaction(
  from: Address,
  to: Address,
  value: bigint,
  functionName: string,
  params: any,
  abi: Abi,
  publicClient: PublicClient,
  walletClient: WalletClient,
) {
  const settings = useStore((s) => s.settings);
  const { addLog } = useLogs();

  return useCallback(
    () =>
      contractTransaction(from, to, value, functionName, params, abi, publicClient, walletClient, settings.pythUrl)
        .then((result) => {
          addLog('info', `Sending ${to}: ${functionName}(${params})`);
          return { value: result, error: null };
        })
        .catch((error) => {
          addLog('error', `Error sending ${to}: ${functionName}(${params})`);
          return { value: null, error: error as Error };
        }),
    [from, to, functionName, params, abi, publicClient, walletClient, settings.pythUrl, addLog],
  );
}
