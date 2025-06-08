import { createWriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import { ChainBuilderRuntime } from '@usecannon/builder';
import { ensureFileSync } from 'fs-extra';
import * as viem from 'viem';
import { createStepsStream } from './stream-steps';
import { DumpRenderer } from './types';
import { Transform } from 'node:stream';
import { writeFile } from 'node:fs/promises';

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

  // Create a transform stream to collect all data
  const dataCollector = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      this.push(chunk);
      callback();
    }
  });

  const stream = events.stream // Listen for step execution events
    .pipe(events.fetchTransactions) // asynchronically add the executed transactions
    .pipe(createRenderer(Number(blockNumber))) // render step lines into the desired format
    .pipe(dataCollector); // collect all data in memory

  return {
    end: async () => {
      // The runtime does not have an event to notify when the build has finished
      // so, we have to manully stop listening to it and close the streams.
      events.stream.end();

      // Wait for all data to be collected
      await viem.withTimeout(() => finished(stream), {
        timeout: 60000,
        errorInstance: new Error('stream timed out'),
      });

      // Write all collected data to file atomically
      const data = dataCollector.readableObjectMode ? dataCollector.read() : [];
      await writeFile(targetFile, data.join(''));
    },
  };
}
