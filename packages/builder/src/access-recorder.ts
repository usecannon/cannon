import Debug from 'debug';
import _ from 'lodash';
import * as viem from 'viem';
import { CannonHelperContext } from './types';
import { template } from './utils/template';

const debug = Debug('cannon:builder:access-recorder');

class ExtendableProxy {
  readonly accessed = new Map<string, AccessRecorder>();

  constructor(defaultValue?: any) {
    return new Proxy(this, {
      get: (obj: any, prop: string) => {
        if (prop === 'accessed' || prop === 'getAccesses') {
          return obj[prop];
        }
        if (!this.accessed.has(prop)) {
          this.accessed.set(prop, defaultValue === undefined ? new AccessRecorder() : defaultValue);
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

  type AccessRecorderMap = { [k: string]: AccessRecorder };
  const recorders: { [k: string]: AccessRecorder | AccessRecorderMap } = {
    contracts: new AccessRecorder(),
    imports: new AccessRecorder(),
    extras: new AccessRecorder(),
    txns: new AccessRecorder(),
    // For settings, we give it a zeroAddress as a best case scenarion that is going
    // to be working for most cases.
    // e.g., when calculating a setting value for 'settings.owners.split(',')' or 'settings.someNumber' will work.
    settings: new AccessRecorder(viem.zeroAddress),
  };

  for (const [n, ctxVal] of Object.entries(CannonHelperContext)) {
    if (typeof ctxVal === 'function') {
      // the types have been a massive unsolvableseeming pain here
      recorders[n] = _.noop as unknown as AccessRecorder;
    } else if (typeof ctxVal === 'object') {
      for (const [key, val] of Object.entries(ctxVal)) {
        if (typeof val === 'function') {
          if (!recorders[n]) recorders[n] = {} as AccessRecorderMap;
          (recorders[n] as AccessRecorderMap)[key] = _.noop as unknown as AccessRecorder;
        } else {
          recorders[n] = ctxVal as unknown as AccessRecorder;
        }
      }
    } else {
      recorders[n] = ctxVal as unknown as AccessRecorder;
    }
  }

  for (const n of possibleNames) {
    recorders[n] = new AccessRecorder();
  }

  const baseTemplate = template(str, {
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
