import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import _ from 'lodash';

import * as viem from 'viem';
import { useState, useEffect } from 'react';

export function useDeployerWallet(chainId?: number) {
  // for now, we just return the currently connected wallet
  const connectedAccount = useAccount();

  const [queuedTransactions, setQueuedTransactions] = useState<viem.TransactionRequestBase[]>([]);
  const [executionProgress, setExecutionProgress] = useState<viem.Hash[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const { switchChainAsync } = useSwitchChain();
  const { sendTransaction, isIdle, data: hash, error: txnError } = useSendTransaction();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(
    function () {
      if (!chainId) {
        return;
      }

      (async () => {
        // is this the first transaction, or have we finished executing a transaction?
        if ((isIdle && !executionProgress.length && queuedTransactions.length) || isConfirmed) {
          // ensure we are on the correct network
          await switchChainAsync({ chainId });
          // execute the next transaction
          sendTransaction(
            {
              ...queuedTransactions[executionProgress.length],
              type: queuedTransactions[executionProgress.length].type as
                | 'legacy'
                | 'eip2930'
                | 'eip1559'
                | 'eip4844'
                | 'eip7702'
                | undefined,
            },
            {
              onSuccess(hash: viem.Hash) {
                setExecutionProgress([...executionProgress, hash]);
              },
            }
          );
        }
      })()
        .then(_.noop)
        .catch((err) => {
          // unexpected issue in the deployer
          // eslint-disable-next-line no-console
          console.error('deployer issue', err);
          setError(err);
        });
    },
    [isConfirmed, isIdle, executionProgress.length, queuedTransactions, chainId, executionProgress]
  );

  return {
    address: connectedAccount.address,
    queuedTransactions,
    executionProgress,
    isComplete: queuedTransactions.length > 0 && executionProgress.length === queuedTransactions.length,
    error: error || txnError,
    queueTransactions: function (txn: viem.TransactionRequestBase[]) {
      setQueuedTransactions([...queuedTransactions, ...txn]);
    },
    reset: function () {
      setQueuedTransactions([]);
      setExecutionProgress([]);
    },
  };
}
