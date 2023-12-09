import { useEffect, useState } from 'react';
import { Hex, TransactionRequestBase } from 'viem';
import { createFork } from '@/helpers/rpc';
import { SafeDefinition } from '@/helpers/store';

type SimulatedTransactionResult = {
  gasUsed: bigint;
  callResult: Hex;
  error?: string;
};

export function useSimulatedTxns(safe: SafeDefinition, txns: (Omit<TransactionRequestBase, 'from'> | null)[]) {
  const [node, setNode] = useState<any>(null);
  const [txnResults, setTxnResults] = useState<(SimulatedTransactionResult | null)[]>([]);
  const [cleanStateSnapshot, setCleanStateSnapshot] = useState<string | null>(null);
  const [computedTxns, setComputedTxns] = useState<string | null>(null);

  const runTxns = async () => {
    console.log('starting fork simulate');
    const results: (SimulatedTransactionResult | null)[] = [];

    for (const txn of txns) {
      if (!txn) {
        results.push(null);
      }

      try {
        const rawEthCall = await node?.request({
          method: 'eth_call',
          params: [{ from: safe.address, to: txn?.to, data: txn?.data }],
        });

        const hash = await node?.request({
          method: 'eth_sendTransaction',
          params: [{ from: safe.address, to: txn?.to, data: txn?.data }],
        });

        const receipt = await node?.request({
          method: 'eth_getTransactionReceipt',
          params: [hash ?? ''],
        });

        //const receipt = await publicClient.waitForTransactionReceipt({ hash })

        results.push({
          gasUsed: BigInt(receipt?.gasUsed as any),
          callResult: rawEthCall as Hex,
        });
      } catch (err: any) {
        // record error and continue to try to execute more txns
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
    async function load() {
      const _node = await createFork({ chainId: safe.chainId, impersonate: [safe.address] });
      setNode(_node);
      setCleanStateSnapshot((await _node?.request({ method: 'evm_snapshot', params: [] })) ?? '');
      console.log('finished creating fork');
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [safe]);

  useEffect(() => {
    if (cleanStateSnapshot && JSON.stringify(txns) !== computedTxns) {
      setCleanStateSnapshot(null);
      void node?.send('evm_revert', [cleanStateSnapshot]).then(async () => {
        const newCleanState = await node?.request({
          method: 'evm_snapshot',
          params: [],
        });
        try {
          await runTxns();
        } catch (err) {
          // ignore
        }

        setComputedTxns(JSON.stringify(txns));
        setCleanStateSnapshot(newCleanState ?? '');
      });
    }
    // cant do anything until its done with current simulation
  }, [txns, cleanStateSnapshot]);

  return {
    txnResults,
  };
}
