import { EOL } from 'node:os';
import { Transform } from 'node:stream';

/**
 * This script is used to deploy contracts using Ethers.js.
 * It outputs a JS script that can be used to deploy contracts and execute transactions.
 * Note: Make sure you add `.js` extension to the output file.
 */

import type { DumpLine, DumpRenderer } from './types';
const header = `/* eslint-disable */

export const transactions = [
`;

const footer = `];

export async function build(signer) {
  console.log(\`Signer: \${await signer.getAddress()}\`);
  console.log();

  const txs = [];

  for (const { title, depth, to, data, value } of transactions) {
    const indent = '  '.repeat(depth);
    console.log(\`\${indent}\${title}\`);
    if (!data) continue; // it is a provision step, it doesn't have a tx
    const tx = await signer.sendTransaction({ to, data, value });
    await tx.wait();
    console.log(\`\${indent}  tx hash: \${tx.hash}\`);
    txs.push(tx);
  }

  return txs;
}
`;

export const createRenderer: DumpRenderer = () =>
  new Transform({
    objectMode: true,
    construct(cb) {
      this.push(header);
      return cb();
    },
    transform(line: DumpLine, _, cb) {
      const title = `[${line.type}.${line.label}]`;

      // provision and import steps don't execute txs, but we want to log them
      if (!line.result) {
        this.push(`  ${JSON.stringify({ title, depth: line.depth })},${EOL}`);
      }

      for (const { to, input, value } of line.txns) {
        const params: { title: string; depth: number; data: string; to?: string; value?: any /** BigNumberish */ } = {
          title,
          depth: line.depth,
          data: input,
        };

        // contract deployments doesn't have a "to" or "value"
        if (to) params.to = to;
        if (value) params.value = value;

        this.push(`  ${JSON.stringify(params)},${EOL}`);
      }

      return cb();
    },
    flush(cb) {
      this.push(footer);
      return cb();
    },
  });
