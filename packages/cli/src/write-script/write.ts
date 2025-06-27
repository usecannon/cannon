import { ChainBuilderRuntime } from '@usecannon/builder';
import { ensureFileSync } from 'fs-extra';
import { createStepsStream } from './stream-steps';
import { DumpRenderer } from './types';
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
  const renderer = createRenderer(Number(blockNumber));

  // Collect all events into an array
  const eventsData: string[] = [];

  // Set up the event processing pipeline
  events.stream
    .pipe(events.fetchTransactions)
    .pipe(renderer)
    .on('data', (chunk: string) => {
      eventsData.push(chunk);
    });

  return {
    end: async () => {
      // The runtime does not have an event to notify when the build has finished
      // so, we have to manully stop listening to it and close the streams.
      events.stream.end();

      // Write all collected data to file atomically
      await writeFile(targetFile, eventsData.join(''));
    },
  };
}
