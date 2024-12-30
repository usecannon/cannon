import Debug from 'debug';
import _ from 'lodash';
import * as viem from 'viem';
import { template } from './utils/template';
import { CannonHelperContext } from './types';

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

type AccessRecorderMap = { [k: string]: AccessRecorder };

type TemplateContext = {
  [k: string]: AccessRecorder | AccessRecorderMap;
};

/**
 * Setup the template context.
 * @param possibleNames - The possible names to setup the context for
 * @returns The template context
 */
function setupTemplateContext(possibleNames: string[] = []): TemplateContext {
  const recorders: TemplateContext = {
    contracts: new AccessRecorder(),
    imports: new AccessRecorder(),
    extras: new AccessRecorder(),
    txns: new AccessRecorder(),
    settings: new AccessRecorder(viem.zeroAddress),
  };

  // setup CannonHelperContext recorders
  for (const [n, ctxVal] of Object.entries(CannonHelperContext)) {
    if (typeof ctxVal === 'function') {
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

  // add possible names
  for (const n of possibleNames) {
    recorders[n] = new AccessRecorder();
  }

  return recorders;
}

/**
 * Collect the accesses from the recorders.
 * @param recorders - The recorders to collect accesses from
 * @param possibleNames - The possible names to collect accesses from
 * @returns The accesses
 */
function collectAccesses(recorders: TemplateContext, possibleNames: string[]): string[] {
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

  return accesses;
}

/**
 * Compute the accesses from the template.
 * @param str - The template to compute accesses from
 * @param possibleNames - The possible names to compute accesses from
 * @returns The accesses
 */
export function computeTemplateAccesses(str?: string, possibleNames: string[] = []): AccessComputationResult {
  if (!str) {
    return { accesses: [], unableToCompute: false };
  }

  const recorders = setupTemplateContext(possibleNames);

  try {
    // we give it "true" for safeContext to avoid cloning and freezing of the object
    // this is because we want to keep the access recorder, and is not a security risk
    // if the user can modify that object
    template(str, recorders, true);
    const accesses = collectAccesses(recorders, possibleNames);
    return { accesses, unableToCompute: false };
  } catch (err) {
    debug('Template execution failed:', err);
    return { accesses: [], unableToCompute: true };
  }
}

/**
 * Merge two template access computation results.
 * @param r1 - The first result
 * @param r2 - The second result
 * @returns The merged result
 */
export function mergeTemplateAccesses(r1: AccessComputationResult, r2: AccessComputationResult): AccessComputationResult {
  return {
    accesses: [...r1.accesses, ...r2.accesses],
    unableToCompute: r1.unableToCompute || r2.unableToCompute,
  };
}
