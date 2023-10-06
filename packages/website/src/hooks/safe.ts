import SafeApiKit from '@safe-global/api-kit';
import { EthersAdapter } from '@safe-global/protocol-kit';
import { ethers } from 'ethers';
import { Address, createWalletClient, getAddress, http, isAddress, keccak256, stringToBytes } from 'viem';
import { mainnet, useAccount, useChainId, useContractReads, useQuery } from 'wagmi';
import { chains } from '@/constants/deployChains';
import { ChainId, SafeDefinition, useStore } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import * as onchainStore from '@/helpers/onchain-store';
import { supportedChains } from '@/providers/walletProvider';
import { findChainUrl } from '@/helpers/rpc';

export type SafeString = `${ChainId}:${Address}`;

export function safeToString(safe: SafeDefinition): SafeString {
  return `${safe.chainId as ChainId}:${safe.address}`;
}

export function parseSafe(safeString: string): SafeDefinition {
  const [chainId, address] = safeString.split(':');
  return {
    chainId: Number.parseInt(chainId) as ChainId,
    address: getAddress(address),
  };
}

const addressStringRegex = /^[1-9][0-9]*:0x[a-fA-F0-9]{40}$/;

export function isValidSafeString(safeString: string): boolean {
  if (typeof safeString !== 'string') return false;
  if (!addressStringRegex.test(safeString)) return false;
  const chainId = Number.parseInt(safeString.split(':')[0]);
  return chains.some((chain) => chain.id === chainId);
}

export function getSafeFromString(safeString: string): SafeDefinition | null {
  if (!isValidSafeString(safeString)) return null;
  const [chainId, address] = safeString.split(':');
  return {
    chainId: Number.parseInt(chainId) as ChainId,
    address: getAddress(address),
  };
}

export function isValidSafe(safe: SafeDefinition): boolean {
  return (
    !!safe &&
    isAddress(safe.address) &&
    typeof safe.chainId === 'number' &&
    supportedChains.some((chain) => chain.id === safe.chainId)
  );
}

export function getShortName(safe: SafeDefinition) {
  return chains.find((chain) => chain.id === safe.chainId)?.shortName;
}

export function getSafeShortNameAddress(safe: SafeDefinition) {
  return `${getShortName(safe)}:${getAddress(safe.address)}`;
}

export function getSafeUrl(safe: SafeDefinition, pathname = '/home') {
  const address = getSafeShortNameAddress(safe);
  return `https://app.safe.global${pathname}?safe=${address}`;
}

function _createSafeApiKit(chainId: number) {
  if (!chainId) return null;

  const chain = chains.find((chain) => chain.id === chainId);

  if (!chain?.serviceUrl) return null;

  const provider = new ethers.providers.Web3Provider(
    createWalletClient({
      chain: mainnet,
      transport: http(findChainUrl(mainnet.id)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  );

  return new SafeApiKit({
    txServiceUrl: chain.serviceUrl,
    ethAdapter: new EthersAdapter({
      ethers,
      signerOrProvider: provider,
    }),
  });
}

export function useExecutedTransactions(safe?: SafeDefinition) {
  const txsQuery = useQuery(['safe-service', 'all-txns', safe?.chainId, safe?.address], async () => {
    if (!safe) return null;
    const safeService = _createSafeApiKit(safe.chainId);
    const res = await safeService?.getMultisigTransactions(safe.address);
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
        })) as unknown as SafeTransaction[],
    };
  });

  return txsQuery?.data || { count: 0, next: null, previous: null, results: [] };
}

export function usePendingTransactions(safe?: SafeDefinition) {
  const txsQuery = useQuery(['safe-service', 'pending-txns', safe?.chainId, safe?.address], async () => {
    if (!safe) return null;
    const safeService = _createSafeApiKit(safe.chainId);
    return await safeService?.getPendingTransactions(safe.address);
  });

  return txsQuery?.data || { count: 0, next: null, previous: null, results: [] };
}

export function useWalletPublicSafes() {
  const { address } = useAccount();

  const txsQuery = useQuery(['safe-service', 'wallet-safes', address], async () => {
    const results: SafeDefinition[] = [];
    if (!address) return results;
    await Promise.all(
      supportedChains.map(async (chain) => {
        const safeService = _createSafeApiKit(chain.id);
        if (!safeService) return;
        const res = await safeService.getSafesByOwner(address);
        if (!Array.isArray(res.safes)) return;
        for (const safe of res.safes) {
          results.push({ chainId: chain.id, address: safe as Address });
        }
      })
    );
    return results;
  });

  return txsQuery.data || ([] as SafeDefinition[]);
}

export function useSafeAddress() {
  const chainId = useChainId();
  return useStore((s) => s.safeAddresses.find((s) => s.chainId === chainId)?.address || null);
}

export function useGetPreviousGitInfoQuery(safe: SafeDefinition, gitRepoUrl: string) {
  // get previous deploy info git information
  return useContractReads({
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
  } as any);
}
