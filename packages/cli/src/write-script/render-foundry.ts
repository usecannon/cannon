import { EOL } from 'node:os';
import { Transform } from 'node:stream';

/**
 * This script is used to deploy contracts using Foundry Cast.
 * It outputs a bash script that can be used to deploy contracts and execute transactions.
 * Note: Make sure you add `.sh` extension to the output file.
 */

const header = `#!/bin/bash

# Set your environment variables
export PRIVATE_KEY=<your_private_key>
export RPC_URL=<your_rpc_url>

# Start processing transactions
`;

const footer = `
echo "Transactions complete."
`;

export const createRenderer = () =>
  new Transform({
    objectMode: true,
    construct(cb) {
      this.push(header); // Bash script header
      return cb();
    },
    transform(line, _, cb) {
      const title = `[${line.type}.${line.label}]`;

      if (!line.result) {
        // Logging non-transaction steps
        this.push(`# ${'  '.repeat(line.depth)}${title}${EOL}`);
      }

      for (const { to, input, value } of line.txns) {
        // Start building the `cast send` command
        let command = 'cast send';

        // Add `--to` if present (for non-deployment transactions)
        if (to) {
          command += `--to ${to}`;
        }

        // Add `--value` if a value is specified
        if (value) {
          command += ` --value ${value}`;
        }

        // Add private key and RPC URL from environment variables
        command += ' --private-key $PRIVATE_KEY --rpc-url $RPC_URL';

        if (!to) {
          command += ' --create';
        }

        // Add calldata
        command += ` ${input}`;

        // Log the title and command
        const indent = '  '.repeat(line.depth);
        this.push(`${indent}echo "Executing: ${title}"${EOL}`);
        this.push(`${indent}${command}${EOL}${EOL}`);
      }

      return cb();
    },
    flush(cb) {
      this.push(footer); // Bash script footer
      return cb();
    },
  });
