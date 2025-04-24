import { createWriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import { ChainBuilderRuntime } from '@usecannon/builder';
import { ensureFileSync } from 'fs-extra';
import * as viem from 'viem';
import { createStepsStream } from './stream-steps';
import { DumpRenderer } from './types';

export const WRITE_SCRIPT_FORMATS = ['json', 'ethers', 'foundry', 'cast'] as const;

export type WriteScriptFormat = (typeof WRITE_SCRIPT_FORMATS)[number];

/**
 * Listen for the steps executed by the given runtime and generate a file
 * with all of them on the given format.
 */
export async function createWriteScript(
  runtime: ChainBuilderRuntime,
  targetFile: string,
  format: WriteScriptFormat = 'json'
) {
  if (!WRITE_SCRIPT_FORMATS.includes(format)) {
    throw new Error(`Invalid build dump format "${format}"`);
  }

  ensureFileSync(targetFile);

  const createRenderer = (await import(`./render-${format}`)).createRenderer as DumpRenderer;

  const events = createStepsStream(runtime);

  const blockNumber = await runtime.provider.getBlockNumber();

  const stream = events.stream // Listen for step execution events
    .pipe(events.fetchTransactions) // asynchronically add the executed transactions
    .pipe(createRenderer(Number(blockNumber))) // render step lines into the desired format
    .pipe(createWriteStream(targetFile)); // save to file

  return {
    end: async () => {
      // The runtime does not have an event to notify when the build has finished
      // so, we have to manully stop listening to it and close the streams.
      events.stream.end();

      await viem.withTimeout(() => finished(stream), {
        timeout: 10000,
        errorInstance: new Error('stream timed out'),
      });
    },
  };
}
