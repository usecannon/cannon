import { createFork } from '@/helpers/rpc';
import { SafeDefinition } from '@/helpers/store';
import { useEffect, useState } from 'react';
import { Hex, TransactionRequestBase } from 'viem';

type SimulatedTransactionResult = {
  gasUsed: bigint;
  callResult: Hex;
  error?: string;
};

function useFork({ chainId, impersonate = [] }: { chainId: number; impersonate: string[] }) {
  const [fork, setFork] = useState<any>(null);

  useEffect(() => {
    void (async function load() {
      setFork(await createFork({ chainId, impersonate }));
    })();
  }, [chainId, impersonate.join(',')]);

  return fork;
}

export function useSimulatedTxns(safe: SafeDefinition, txns: (Omit<TransactionRequestBase, 'from'> | null)[]) {
  const [txnResults, setTxnResults] = useState<(SimulatedTransactionResult | null)[]>([]);
  const [cleanStateSnapshot, setCleanStateSnapshot] = useState<string | null>(null);
  const [computedTxns, setComputedTxns] = useState<string | null>(null);
  const fork = useFork({ chainId: safe.chainId, impersonate: [safe.address] });

  const runTxns = async () => {
    if (!fork) throw new Error('Fork not loaded');

    const results: (SimulatedTransactionResult | null)[] = [];

    for (const txn of txns) {
      if (!txn) {
        results.push(null);
      }

      try {
        const rawEthCall = await fork.request({
          method: 'eth_call',
          params: [{ from: safe.address, to: txn?.to, data: txn?.data }],
        });

        const hash = await fork.request({
          method: 'eth_sendTransaction',
          params: [{ from: safe.address, to: txn?.to, data: txn?.data }],
        });

        const receipt = await fork.request({
          method: 'eth_getTransactionReceipt',
          params: [hash ?? ''],
        });

        results.push({
          gasUsed: BigInt(receipt?.gasUsed || 0),
          callResult: rawEthCall as Hex,
        });
      } catch (err: any) {
        // record error and continue to try to execute more txns
        /* eslint no-console: "off" */
        console.log('full txn error', err, txn);
        results.push({
          gasUsed: BigInt(0),
          callResult: err.data,
          error: err.toString(),
        });
      }
    }

    setTxnResults(results);
  };

  useEffect(() => {
    if (!fork) return setCleanStateSnapshot(null);

    void (async function load() {
      setCleanStateSnapshot((await fork.request({ method: 'evm_snapshot', params: [] })) ?? '');
    })();
  }, [fork]);

  useEffect(() => {
    if (!fork) return;

    if (cleanStateSnapshot && JSON.stringify(txns) !== computedTxns) {
      setCleanStateSnapshot(null);
      void fork.send('evm_revert', [cleanStateSnapshot]).then(async () => {
        const newCleanState = await fork.request({
          method: 'evm_snapshot',
          params: [],
        });

        try {
          await runTxns();
        } catch (err) {
          console.error('simulation error: ', err);
        }

        setComputedTxns(JSON.stringify(txns));
        setCleanStateSnapshot(newCleanState ?? '');
      });
    }
    // cant do anything until its done with current simulation
  }, [fork, txns, cleanStateSnapshot]);

  return {
    txnResults,
  };
}
