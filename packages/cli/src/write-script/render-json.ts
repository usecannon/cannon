import { EOL } from 'node:os';
import { Transform } from 'node:stream';

import type { DumpLine } from './types.js';

export function createRenderer() {
  return new Transform({
    transform(line: DumpLine, _, cb) {
      this.push(`${JSON.stringify(line)}${EOL}`);
      return cb();
    },
    objectMode: true,
  });
}
