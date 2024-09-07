import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import _ from 'lodash';

import * as viem from 'viem';
import { useState, useEffect } from 'react';

export function useDeployerWallet(chainId?: number) {
  // for now, we just return the currently connected wallet
  const connectedAccount = useAccount();

  const [queuedTransactions, setQueuedTransactions] = useState<viem.TransactionRequestBase[]>([]);
  const [executionProgress, setExecutionProgress] = useState<viem.Hash[]>([]);

  const { switchChainAsync } = useSwitchChain();

  const { sendTransaction, isIdle, data: hash } = useSendTransaction();

  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(
    function () {
      if (!chainId) {
        throw new Error('missing required parameters');
      }

      (async () => {
        // is this the first transaction, or have we finished executing a transaction?
        if ((isIdle && !executionProgress.length) || isConfirmed) {
          // ensure we are on the correct network
          await switchChainAsync({ chainId });

          // execute the next transaction
          sendTransaction(queuedTransactions[executionProgress.length], {
            onSuccess(hash: viem.Hash) {
              setExecutionProgress([...executionProgress, hash]);
            },
          });
        }
      })()
        .then(_.noop)
        .catch((err) => {
          // unexpected issue in the deployer
        });
    },
    [isConfirmed, queuedTransactions]
  );

  return {
    address: connectedAccount.address,
    queuedTransactions,
    executionProgress,
    queueTransactions: function (txn: viem.TransactionRequestBase[]) {
      setQueuedTransactions([...queuedTransactions, ...txn]);
    },
    reset: function () {
      setQueuedTransactions([]);
      setExecutionProgress([]);
    },
  };
}
