import { useState } from 'react';
import { Address } from 'viem';
import { PublicClient, WalletClient } from 'wagmi';
import { Abi } from 'abitype/src/abi';
import { contractCall, contractTransaction } from '@/helpers/ethereum';
import { useStore } from '@/helpers/store';
import { useLogs } from '@/providers/logsProvider';

export function useContractCall(to: Address, functionName: string, params: any, abi: Abi, publicClient: PublicClient) {
  const [data, setData] = useState<any>(null);
  const settings = useStore((s) => s.settings);
  const { addLog } = useLogs();

  const fetch = async () => {
    const result = await contractCall(to, functionName, params, abi, publicClient, settings.pythUrl);
    addLog(`Contract ${to} call of ${functionName} method with parameters (${params}) returned ${result}`);
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
    addLog(`Hash of contract ${to} tx using ${functionName} method with parameters (${params}) is ${result}`);
    setData(result);
  };
  return [data, fetch];
}
