import _ from 'lodash';
import { CannonHelperContext } from './types';

import Debug from 'debug';

const debug = Debug('cannon:builder:access-recorder');

class ExtendableProxy {
  readonly accessed = new Map<string, AccessRecorder>();

  constructor() {
    return new Proxy(this, {
      get: (obj: any, prop: string) => {
        if (prop === 'accessed' || prop === 'getAccesses') {
          return obj[prop];
        }
        if (!this.accessed.has(prop)) {
          this.accessed.set(prop, new AccessRecorder());
        }

        if (typeof prop === 'symbol') {
          return () => '';
        } else if ((CannonHelperContext as any)[prop]) {
          // return a dummy function which returns nothing.
          // this increases the probability that an expression will work out in the template
          return _.noop;
        }

        return this.accessed.get(prop);
      },
    });
  }
}
export class AccessRecorder extends ExtendableProxy {
  getAccesses(depth: number, cur = 1) {
    if (cur == depth) {
      return Array.from(this.accessed.keys());
    }

    const acc: string[] = [];
    for (const k in this.accessed.keys()) {
      acc.push(k);
      acc.push(
        ...this.accessed
          .get(k)!
          .getAccesses(depth, (cur || 1) + 1)
          .map((a) => `${k}.${a}`)
      );
    }

    return acc;
  }
}
export type AccessComputationResult = { accesses: string[]; unableToCompute: boolean };

export function computeTemplateAccesses(str?: string, possibleNames: string[] = []): AccessComputationResult {
  if (!str) {
    return { accesses: [], unableToCompute: false };
  }

  const recorders: { [k: string]: AccessRecorder } = {
    contracts: new AccessRecorder(),
    imports: new AccessRecorder(),
    extras: new AccessRecorder(),
    txns: new AccessRecorder(),
    settings: new AccessRecorder(),
  };

  for (const n in CannonHelperContext) {
    if (typeof (CannonHelperContext as any)[n] === 'function') {
      // the types have been a massive unsolvableseeming pain here
      recorders[n] = _.noop as unknown as AccessRecorder;
    } else if (typeof (CannonHelperContext as any)[n] === 'object') {
      for (const o in (CannonHelperContext as any)[n]) {
        (recorders[n] as any) = {};
        if (typeof (CannonHelperContext as any)[n][o] === 'function') {
          (recorders[n] as any)[o] = _.noop as unknown as AccessRecorder;
        } else {
          recorders[n] = (CannonHelperContext as any)[n] as unknown as AccessRecorder;
        }
      }
    } else {
      recorders[n] = (CannonHelperContext as any)[n] as unknown as AccessRecorder;
    }
  }

  for (const n of possibleNames) {
    recorders[n] = new AccessRecorder();
  }

  const baseTemplate = _.template(str, {
    imports: recorders,
  });

  let unableToCompute = false;
  try {
    baseTemplate();
  } catch (err) {
    debug('ran into template processing error, mark unable to compute', err);
    unableToCompute = true;
  }

  const accesses: string[] = [];

  for (const recorder of _.difference(Object.keys(recorders), Object.keys(CannonHelperContext))) {
    if (recorders[recorder] instanceof AccessRecorder) {
      if (possibleNames.includes(recorder) && recorders[recorder].accessed.size > 0) {
        accesses.push(recorder);
      } else {
        accesses.push(...Array.from(recorders[recorder].accessed.keys()).map((a: string) => `${recorder}.${a}`));
      }
    }
  }

  return { accesses, unableToCompute };
}

export function mergeTemplateAccesses(r1: AccessComputationResult, r2: AccessComputationResult): AccessComputationResult {
  return {
    accesses: [...r1.accesses, ...r2.accesses],
    unableToCompute: r1.unableToCompute || r2.unableToCompute,
  };
}
