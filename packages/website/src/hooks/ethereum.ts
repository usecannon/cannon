import { contractCall, contractTransaction } from '@/helpers/ethereum';
import { useStore } from '@/helpers/store';
import { useLogs } from '@/providers/logsProvider';
import { Abi } from 'abitype/src/abi';
import { useState } from 'react';
import { Address, PublicClient, WalletClient } from 'viem';

export function useContractCall(to: Address, functionName: string, params: any, abi: Abi, publicClient: PublicClient) {
  const [data, setData] = useState<any>(null);
  const settings = useStore((s) => s.settings);
  const { addLog } = useLogs();

  const fetch = async (from: Address) => {
    addLog(`Querying ${to} (Chain ID ${publicClient.chain!.id}): ${functionName}(${params})`);
    const result = await contractCall(from, to, functionName, params, abi, publicClient, settings.pythUrl);
    setData(result);
  };
  return [data, fetch];
}

export function useContractTransaction(
  from: Address,
  to: Address,
  functionName: string,
  params: any,
  abi: Abi,
  publicClient: PublicClient,
  walletClient: WalletClient
) {
  const [data, setData] = useState<any>(null);
  const settings = useStore((s) => s.settings);
  const { addLog } = useLogs();

  const fetch = async () => {
    const result = await contractTransaction(
      from,
      to,
      functionName,
      params,
      abi,
      publicClient,
      walletClient,
      settings.pythUrl
    );
    addLog(`Sending ${to}: ${functionName}(${params})`);
    setData(result);
  };
  return [data, fetch];
}
