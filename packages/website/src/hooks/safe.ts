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
  PublicClient,
  zeroAddress,
  decodeFunctionData,
  recoverAddress,
  recoverMessageAddress,
  toHex,
  concat,
} from 'viem';
import { useAccount, useReadContracts } from 'wagmi';
import SafeABI from '@/abi/Safe.json';
import SafeABI_v1_4_1 from '@/abi/Safe-v1.4.1.json';
import * as onchainStore from '@/helpers/onchain-store';
import { SafeDefinition, useStore } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { CustomChainMetadata, useCannonChains } from '@/providers/CannonProvidersProvider';
import ms from 'ms';
import { batches } from '@/helpers/batches';

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

export function useSafeUrl() {
  const { chainMetadata } = useCannonChains();

  return (safe: SafeDefinition, pathname = '/home') => {
    const shortName = chainMetadata[safe.chainId]?.shortName;
    const address = shortName ? `${shortName}:${safe.address}` : safe.address;
    return `https://app.safe.global${pathname}?safe=${address}`;
  };
}

function _createSafeApiKit(chainId: number, chainMetadata: CustomChainMetadata) {
  if (!chainId) return null;
  const chain = chainMetadata[chainId];
  if (!chain?.serviceUrl) return null;

  return new SafeApiKit({
    chainId: BigInt(chainId),
    txServiceUrl: new URL('/api', chain.serviceUrl).toString(),
  });
}

async function _getAverageBlockTime(client: PublicClient, latestBlockNumber: number, numBlocks = 10) {
  const [latestBlock, oldBlock] = await Promise.all([
    client.getBlock({ blockNumber: BigInt(latestBlockNumber) }),
    client.getBlock({ blockNumber: BigInt(latestBlockNumber - numBlocks) }),
  ]);

  // Calculate average time per block in seconds
  const timeDiff = Number(latestBlock.timestamp) - Number(oldBlock.timestamp);
  const averageBlockTime = timeDiff / numBlocks;

  return averageBlockTime; // in seconds
}

async function _getSafeSigners(signatures: string, safeTxHash: Hash) {
  // Remove '0x' prefix if present
  const sigs = signatures.startsWith('0x') ? signatures.slice(2) : signatures;

  const signers: Address[] = [];
  // Each signature is 65 bytes (130 chars) + 1 byte (2 chars) for v
  const signatureLength = 132;

  for (let i = 0; i < sigs.length; i += signatureLength) {
    const signature = sigs.slice(i, i + signatureLength);

    // Extract components
    const r = ('0x' + signature.slice(0, 64)) as Hash;
    const s = ('0x' + signature.slice(64, 128)) as Hash;
    const v = Number.parseInt(signature.slice(128, 130), 16);

    // Combine into signature format
    const sig = concat([r, s, toHex(v)]);

    // Recover signer address
    console.log('log recoverAddress', sig);
    const signer = await recoverAddress({
      hash: safeTxHash,
      signature: sig,
    });
    console.log('log recoverAddress', signer);

    signers.push(signer);
  }

  return signers;
}

const _safeEventNames = ['ExecutionSuccess', 'ExecutionFailure', 'SignMsg'];
const _safeEvents = SafeABI.filter((abi) => abi.type === 'event' && _safeEventNames.includes(abi.name || ''));

export function useExecutedTransactionsFromRpc(safe?: SafeDefinition | null) {
  const { getChainById } = useCannonChains();

  return useQuery({
    queryKey: ['executed-transactions-rpc', safe?.chainId, safe?.address],
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      if (!safe) return null;

      const chain = getChainById(safe.chainId);
      const client = createPublicClient({
        chain,
        transport: http(chain?.rpcUrls.default.http[0]),
      });

      const latestBlock = Number(await client.getBlockNumber().then((bn) => bn.toString()));
      const averageBlockTime = await _getAverageBlockTime(client, latestBlock);
      const blocksInDay = Math.floor(ms('24h') / 1000 / averageBlockTime);
      const blocksInTenDays = Math.floor(ms('10d') / 1000 / averageBlockTime);

      const txs: SafeTransaction[] = [];

      for (const [fromBlock, toBlock] of batches(latestBlock, latestBlock - blocksInTenDays, blocksInDay)) {
        const filter = await client.createEventFilter({
          address: safe.address,
          events: _safeEvents,
          fromBlock: BigInt(toBlock),
          toBlock: BigInt(fromBlock),
        });

        const logs = await client.getFilterLogs({ filter });

        for (const log of logs) {
          const _nonce = (await client.readContract({
            address: safe.address,
            abi: SafeABI,
            functionName: 'nonce',
            args: [],
            blockNumber: log.blockNumber - BigInt(1), // the nonce is the one from the previous block
          })) as bigint;

          const confirmationsRequired = (await client.readContract({
            address: safe.address,
            abi: SafeABI,
            functionName: 'getThreshold',
            args: [],
            blockNumber: log.blockNumber - BigInt(1), // the nonce is the one from the previous block
          })) as bigint;

          const block = await client.getBlock({
            blockNumber: log.blockNumber,
          });

          const transaction = await client.getTransaction({
            hash: log.transactionHash,
          });
          console.log('log transaction', transaction);

          // Decode the data separately
          const decodedData = decodeFunctionData({
            abi: SafeABI.filter((abi) => abi.name === 'execTransaction'),
            data: transaction.input,
          }) as any;

          console.log('log decodedData', decodedData);

          const signatures = decodedData?.args?.[9];
          const txHash = (log as any).args.txHash as Hash;

          const confirmedSigners = await _getSafeSigners(signatures, txHash);

          console.log('log confirmedSigners', confirmedSigners);

          txs.push({
            to: log.address,
            value: decodedData?.args?.[1].toString() || '0',
            data: decodedData?.args?.[2].toString() || '0x',
            operation: decodedData?.args?.[3].toString() || '0',
            safeTxGas: decodedData?.args?.[4].toString() || '0',
            baseGas: decodedData?.args?.[5].toString() || '0',
            gasPrice: decodedData?.args?.[6].toString() || '0',
            gasToken: decodedData?.args?.[7].toString() || zeroAddress,
            refundReceiver: decodedData?.args?.[8].toString() || zeroAddress,
            _nonce: Number(_nonce.toString()),
            transactionHash: log.transactionHash,
            safeTxHash: txHash,
            submissionDate: block.timestamp.toString(),
            confirmationsRequired: Number(confirmationsRequired.toString()),
            confirmedSigners,
          });
        }
      }

      console.log('log txs', txs);

      return txs;
    },
    enabled: !!safe,
  });
}

export function useExecutedTransactions(safe?: SafeDefinition | null) {
  const { chainMetadata } = useCannonChains();

  return useQuery({
    queryKey: ['executed-transactions', safe?.chainId, safe?.address],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      if (!safe) return null;

      const safeService = _createSafeApiKit(safe.chainId, chainMetadata);

      if (!safeService) {
        throw new Error('SAFE_CHAIN_NOT_SUPPORTED');
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
    refetchInterval: ms('30s'),
    enabled: !!safe,
  });
}

export function usePendingTransactions(safe?: SafeDefinition) {
  const { chainMetadata } = useCannonChains();
  const txsQuery = useQuery({
    queryKey: ['safe-service', 'pending-txns', safe?.chainId, safe?.address],
    queryFn: async () => {
      if (!safe) return null;
      const safeService = _createSafeApiKit(safe.chainId, chainMetadata);
      return await safeService?.getPendingTransactions(safe.address);
    },
  });

  return txsQuery?.data || { count: 0, next: null, previous: null, results: [] };
}

export function useWalletPublicSafes() {
  const { address } = useAccount();
  const { chains, chainMetadata } = useCannonChains();

  const txsQuery = useQuery({
    queryKey: ['safe-service', 'wallet-safes', address],
    queryFn: async () => {
      const results: SafeDefinition[] = [];
      if (!address) return results;
      await Promise.all(
        chains.map(async (chain) => {
          const safeService = _createSafeApiKit(chain.id, chainMetadata);
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
        abi: onchainStore.ABI,
        address: onchainStore.deployAddress,
        functionName: 'getWithAddress',
        args: [safe.address, keccak256(stringToBytes((gitRepoUrl || '') + 'gitHash'))],
      },
      {
        abi: onchainStore.ABI,
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
