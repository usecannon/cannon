import { parseHintedMulticall } from '@/helpers/cannon';
import { getSafeTransactionHash } from '@/helpers/safe';
import { SafeDefinition } from '@/helpers/store';
import { CannonSafeTransaction, useSafeTransactions, useTxnStager } from '@/hooks/backend';
import { useCannonPackage } from '@/hooks/cannon';
import { useExecutedTransactions, useGetPreviousGitInfoQuery } from '@/hooks/safe';
import { SafeTransaction } from '@/types/SafeTransaction';
import { Hex } from 'viem';

// Helper function moved from TransactionDetailsPage
function getSafeTransaction(
  txsHistory: SafeTransaction[],
  stagedTxs: CannonSafeTransaction[],
  txParamSignatureHash: string,
  txParamNonce: number,
  safeNonce: number,
  safeDefinition: SafeDefinition
) {
  if (safeNonce && txParamNonce < safeNonce) {
    return (
      txsHistory.find(
        (txn: any) =>
          txn._nonce.toString() === txParamNonce.toString() &&
          (!txParamSignatureHash ||
            txParamSignatureHash === txn.safeTxHash ||
            txParamSignatureHash === getSafeTransactionHash(safeDefinition, txn))
      ) || null
    );
  } else if (Array.isArray(stagedTxs) && stagedTxs.length) {
    return (
      stagedTxs.find(
        (s) =>
          s.txn._nonce.toString() === txParamNonce.toString() &&
          (!txParamSignatureHash || txParamSignatureHash === getSafeTransactionHash(safeDefinition, s.txn))
      )?.txn || null
    );
  } else {
    return null;
  }
}

export function useSafeTxInfo(safeDefinition: SafeDefinition, txSignature: string, txNonce: number, txChainId: number) {
  // Get safe transactions data
  const {
    nonce: safeNonce,
    staged: safeStagedTxs,
    refetch: refetchSafeTxs,
    isFetched: isSafeTxsFetched,
  } = useSafeTransactions(safeDefinition);

  // Get executed transactions
  const { data: safeTxsHistory, refetch: refetchHistory } = useExecutedTransactions(safeDefinition);

  // Get specific transaction info
  const safeTxn = getSafeTransaction(
    safeTxsHistory.results,
    safeStagedTxs,
    txSignature,
    txNonce,
    Number(safeNonce),
    safeDefinition
  );

  // Parse multicall data and get related info
  const parsedMulticallData = safeTxn ? parseHintedMulticall(safeTxn.data as Hex) : null;
  const queuedWithGitOps = parsedMulticallData?.type === 'deploy';

  // Get package information
  const cannonPackage = useCannonPackage(parsedMulticallData?.cannonPackage);
  const { pkgUrl: existingRegistryUrl } = useCannonPackage(cannonPackage.fullPackageRef, txChainId);

  // Get git deployment info
  const prevDeployHashQuery = useGetPreviousGitInfoQuery(safeDefinition, parsedMulticallData?.gitRepoUrl ?? '');

  // Get stager
  const stager = useTxnStager(safeTxn || {}, { safe: safeDefinition });

  // Derive additional state
  const isTransactionExecuted = txNonce < safeNonce;
  const unorderedNonce = safeTxn && safeTxn._nonce > safeStagedTxs[0]?.txn._nonce;
  const published = existingRegistryUrl === parsedMulticallData?.cannonPackage;

  return {
    // Transaction Status
    status: {
      isTransactionExecuted,
      unorderedNonce,
      isFetched: isSafeTxsFetched,
      published,
    },

    // Transaction Data
    transaction: {
      safeTxn,
      parsedMulticallData,
      queuedWithGitOps,
    },

    // Safe Data
    safeData: {
      safeNonce,
      safeStagedTxs,
      safeTxsHistory,
    },

    // Package Info
    packageInfo: {
      cannonPackage,
      existingRegistryUrl,
    },

    // Git Info
    gitInfo: {
      prevDeployHashQuery,
    },

    // Transaction Management
    management: {
      stager,
      refetchSafeTxs,
      refetchHistory,
    },
  };
}
