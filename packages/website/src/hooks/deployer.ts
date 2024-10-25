import { useAccount, useSendTransaction, useSwitchChain } from 'wagmi';

import * as viem from 'viem';
import { useState } from 'react';

type Status = 'idle' | 'executing' | 'success' | 'error';

export function useDeployerWallet(chainId?: number) {
  const connectedAccount = useAccount();

  const [transactionStatuses, setTransactionStatuses] = useState<Status[]>([]);
  const [executionProgress, setExecutionProgress] = useState<{
    status: Status;
    message?: string;
  }>({ status: 'idle' });

  const { switchChainAsync } = useSwitchChain();
  const { sendTransaction } = useSendTransaction();

  async function queueTransactions(txns: viem.TransactionRequestBase[]) {
    setTransactionStatuses(Array(txns.length).fill('idle'));
    setExecutionProgress({ status: 'executing' });

    if (!chainId) return;

    try {
      for (let i = 0; i < txns.length; i++) {
        await switchChainAsync({ chainId });

        setTransactionStatuses((prevStatuses) => {
          const newStatuses = [...prevStatuses];
          newStatuses[i] = 'executing';
          return newStatuses;
        });

        sendTransaction(
          {
            ...txns[i],
            type: txns[i].type as 'legacy' | 'eip2930' | 'eip1559' | 'eip4844' | 'eip7702' | undefined,
          },
          {
            onSuccess: () => {
              setTransactionStatuses((prevStatuses) => {
                const newStatuses = [...prevStatuses];
                newStatuses[i] = 'success';
                return newStatuses;
              });

              const isLastTransaction = i === txns.length - 1;
              if (isLastTransaction) {
                setExecutionProgress({ status: 'success' });
              }
            },
            onError: (error) => {
              setTransactionStatuses((prevStatuses) => {
                const newStatuses = [...prevStatuses];
                newStatuses[i] = 'error';
                return newStatuses;
              });
              setExecutionProgress({ status: 'error', message: error.message });
              throw error;
            },
          }
        );
      }
    } catch (err) {
      setExecutionProgress({ status: 'error', message: (err as Error).message });
    }
  }

  return {
    address: connectedAccount.address,
    transactionStatuses,
    executionProgress,
    queueTransactions,
    reset: function () {
      setTransactionStatuses([]);
      setExecutionProgress({ status: 'idle' });
    },
  };
}
