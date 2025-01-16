import { useState, useEffect } from 'react';
import SafeApiKit from '@safe-global/api-kit';
import { useQuery } from '@tanstack/react-query';
import {
  Address,
  Chain,
  getAddress,
  isAddress,
  keccak256,
  stringToBytes,
  Hash,
  createPublicClient,
  http,
  parseEventLogs,
} from 'viem';
import { useAccount, useReadContracts } from 'wagmi';
import SafeABI from '@/abi/Safe.json';
import SafeABI_v1_4_1 from '@/abi/Safe-v1.4.1.json';
import * as onchainStore from '@/helpers/onchain-store';
import { SafeDefinition, useStore } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { chainMetadata, useCannonChains } from '@/providers/CannonProvidersProvider';

export type SafeString = `${number}:${Address}`;

export function safeToString(safe: SafeDefinition): SafeString {
  return `${safe.chainId}:${safe.address}`;
}

export function isValidSafeString(safeString: string): boolean {
  if (typeof safeString !== 'string') return false;
  const chainId = Number.parseInt(safeString.split(':')[0]);
  if (isNaN(chainId)) return false;
  const address = safeString.split(':')[1];
  return isAddress(address || '');
}

export function isValidSafeFromSafeString(safeString: string, chains: Chain[]): boolean {
  if (!isValidSafeString(safeString)) return false;
  const chainId = Number.parseInt(safeString.split(':')[0]);
  const existChain = chains.some((chain) => chain.id === chainId);
  return existChain;
}

export function parseSafe(safeString: string): SafeDefinition {
  const [chainId, address] = safeString.split(':');
  return {
    chainId: Number.parseInt(chainId),
    address: getAddress(address),
  };
}

export function isValidSafe(safe: SafeDefinition, supportedChains: Chain[]): boolean {
  return (
    !!safe &&
    isAddress(safe.address) &&
    typeof safe.chainId === 'number' &&
    supportedChains.some((chain) => chain.id === safe.chainId)
  );
}

function _getSafeShortNameAddress(safe: SafeDefinition) {
  const metadata = chainMetadata[safe.chainId];
  return `${metadata.shortName || safe.chainId}:${getAddress(safe.address)}`;
}

export function getSafeUrl(safe: SafeDefinition, pathname = '/home') {
  const address = _getSafeShortNameAddress(safe);
  return `https://app.safe.global${pathname}?safe=${address}`;
}

function _createSafeApiKit(chainId: number) {
  if (!chainId) return null;

  const chain = chainMetadata[chainId];
  if (!chain?.serviceUrl) return null;

  return new SafeApiKit({
    chainId: BigInt(chainId),
    txServiceUrl: new URL('/api', chain.serviceUrl).toString(),
  });
}

export function useExecutedTransactions(safe?: SafeDefinition | null) {
  const txsQuery = useQuery({
    queryKey: ['executed-transactions', safe?.chainId, safe?.address],
    queryFn: async () => {
      if (!safe) return null;
      const safeService = _createSafeApiKit(safe.chainId);

      if (!safeService) {
        throw new Error(`Safe Chain ID "${safe.chainId}" is not supported by Gnosis"`);
      }

      const res = await safeService.getMultisigTransactions(safe.address);

      return {
        count: (res as unknown as { countUniqueNonce: number }).countUniqueNonce || res?.count,
        next: res?.next,
        previous: res?.previous,
        results: res?.results
          .filter((tx) => tx.isExecuted)
          .map((tx) => ({
            to: tx.to,
            value: tx.value,
            data: tx.data,
            operation: tx.operation,
            safeTxGas: tx.safeTxGas,
            baseGas: tx.baseGas,
            gasPrice: tx.gasPrice,
            gasToken: tx.gasToken,
            refundReceiver: tx.refundReceiver,
            _nonce: tx.nonce,
            transactionHash: tx.transactionHash,
            safeTxHash: tx.safeTxHash,
            submissionDate: tx.submissionDate,
            confirmationsRequired: tx.confirmationsRequired,
            confirmedSigners: tx.confirmations?.map((confirmation) => confirmation.owner),
          })) as unknown as SafeTransaction[],
      };
    },
  });

  return {
    data: txsQuery?.data || { count: 0, next: null, previous: null, results: [] },
    refetch: txsQuery.refetch,
    isLoading: txsQuery.isLoading,
  };
}

export function usePendingTransactions(safe?: SafeDefinition) {
  const txsQuery = useQuery({
    queryKey: ['safe-service', 'pending-txns', safe?.chainId, safe?.address],
    queryFn: async () => {
      if (!safe) return null;
      const safeService = _createSafeApiKit(safe.chainId);
      return await safeService?.getPendingTransactions(safe.address);
    },
  });

  return txsQuery?.data || { count: 0, next: null, previous: null, results: [] };
}

export function useWalletPublicSafes() {
  const { address } = useAccount();
  const { chains } = useCannonChains();

  const txsQuery = useQuery({
    queryKey: ['safe-service', 'wallet-safes', address],
    queryFn: async () => {
      const results: SafeDefinition[] = [];
      if (!address) return results;
      await Promise.all(
        chains.map(async (chain) => {
          const safeService = _createSafeApiKit(chain.id);
          if (!safeService) return;
          // This in order to avoid breaking the whole query if any chain fails
          try {
            const res = await safeService.getSafesByOwner(address);
            if (!Array.isArray(res.safes)) return;
            for (const safe of res.safes) {
              results.push({ chainId: chain.id, address: safe as Address });
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(
              `Error fetching safes for chain ${chain.id}
            `,
              e
            );
          }
        })
      );
      return results;
    },
  });

  return txsQuery.data || ([] as SafeDefinition[]);
}

export function useSafeAddress() {
  return useStore((s) => s.currentSafe?.address || null);
}

export function useGetPreviousGitInfoQuery(safe: SafeDefinition, gitRepoUrl: string) {
  // get previous deploy info git information
  return useReadContracts({
    contracts: [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        abi: onchainStore.ABI as any,
        address: onchainStore.deployAddress,
        functionName: 'getWithAddress',
        args: [safe.address, keccak256(stringToBytes((gitRepoUrl || '') + 'gitHash'))],
      },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        abi: onchainStore.ABI as any,
        address: onchainStore.deployAddress,
        functionName: 'getWithAddress',
        args: [safe.address, keccak256(stringToBytes((gitRepoUrl || '') + 'cannonPackage'))],
      },
    ],
  });
}

export enum SafeTransactionStatus {
  EXECUTION_SUCCESS = 'ExecutionSuccess',
  EXECUTION_FAILURE = 'ExecutionFailure',
}

export const useSafeTransactionStatus = (chainId: number, transactionHash: Hash | undefined) => {
  const { getChainById } = useCannonChains();
  const chain = getChainById(chainId);

  const publicClient = createPublicClient({
    chain,
    transport: http(chain?.rpcUrls.default.http[0]),
  });

  const [status, setStatus] = useState<SafeTransactionStatus | undefined>(undefined);

  useEffect(() => {
    const fetchStatus = async (transactionHash: Hash | undefined) => {
      if (transactionHash) {
        const receipt = await publicClient.getTransactionReceipt({
          hash: transactionHash,
        });

        const logs = parseEventLogs({
          abi: SafeABI,
          logs: receipt.logs,
        });

        const logs_v1_4_1 = parseEventLogs({
          abi: SafeABI_v1_4_1,
          logs: receipt.logs,
        });

        const completeLogs = [...logs, ...logs_v1_4_1];

        const isExecutionFailed = completeLogs.some(
          // @ts-ignore: log.eventName is not typed :/
          (log) => log.eventName === SafeTransactionStatus.EXECUTION_FAILURE
        );

        setStatus(isExecutionFailed ? SafeTransactionStatus.EXECUTION_FAILURE : SafeTransactionStatus.EXECUTION_SUCCESS);
      }
    };

    void fetchStatus(transactionHash);
  }, [transactionHash]);

  return status;
};
