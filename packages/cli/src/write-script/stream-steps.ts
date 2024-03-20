import { Readable, Transform } from 'node:stream';
import { ChainArtifacts, ChainBuilderContext, ChainBuilderRuntime, Events } from '@usecannon/builder';
import { timeout, TimeoutError } from 'promise-timeout';
import { DumpLine } from './types';

import { Hash, Transaction } from 'viem';

/**
 * Create an event stream from step execution events from the ChainBuilderRuntime
 */
export function createStepsStream(runtime: ChainBuilderRuntime) {
  // Listen to step execution events and parse them as DumpLines
  const stream = new StepEventsStream(runtime);

  const getTransaction = async (hash: Hash): Promise<Transaction> => {
    try {
      // TODO: why do types poop out here
      return (await timeout(runtime.provider.getTransaction({ hash }), 15000)) as Transaction;
    } catch (err) {
      if (err instanceof TimeoutError) {
        throw new Error(`TimeoutError: Could not get transaction "${hash}"`);
      }
      throw err;
    }
  };

  // Asynchronically fetch for transactions executed by the step (contract deployments and method calls)
  const fetchTransactions = new Transform({
    objectMode: true,
    async transform(line: DumpLine, _, cb) {
      // get the transaction hashes
      const txHashes = [
        ...Object.values(line.result?.txns || {}).map((tx) => tx.hash),
        ...Object.values(line.result?.contracts || {}).map((c) => c.deployTxnHash),
      ].filter((hash) => !!hash) as Hash[];

      line.txns = await Promise.all(txHashes.map((hash) => getTransaction(hash)));

      this.push(line);
      cb();
    },
  });

  return { stream, fetchTransactions };
}

class StepEventsStream extends Readable {
  private runtime: ChainBuilderRuntime;

  constructor(runtime: ChainBuilderRuntime) {
    super({ objectMode: true });
    this.runtime = runtime;
  }

  _construct(cb: (err?: Error | null | undefined) => void): void {
    const handlePreStepExecute = (type: DumpLine['type'], label: string, step: DumpLine['step'], depth: number) => {
      if (type === 'clone') {
        this.push({ type, label, depth, step, txns: [] });
      }
    };

    const handlePostStepExecute = (
      type: string,
      label: string,
      step: DumpLine['step'],
      ctx: ChainBuilderContext,
      result: ChainArtifacts,
      depth: number
    ) => {
      this.push({ type, label, depth, step, result, txns: [] });
    };

    this.runtime.on(Events.PreStepExecute, handlePreStepExecute);
    this.runtime.on(Events.PostStepExecute, handlePostStepExecute);

    this.on('end', () => {
      this.runtime.off(Events.PreStepExecute, handlePreStepExecute);
      this.runtime.off(Events.PostStepExecute, handlePostStepExecute);
    });

    cb();
  }

  _read() {
    // allow null
  }

  end() {
    this.push(null);
  }
}
