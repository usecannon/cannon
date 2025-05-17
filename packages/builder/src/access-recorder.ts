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
  [k: string]: AccessRecorder | AccessRecorderMap | unknown;
};

/**
 * Setup the template context.
 * @param possibleNames - The possible names to setup the context for
 * @returns The template context
 */
function setupTemplateContext(possibleNames: string[] = []): TemplateContext {
  // Create a fake helper context, so the render works but no real functions are called
  const fakeHelperContext = _createDeepNoopObject(CannonHelperContext);

  const recorders: TemplateContext = {
    // Include base context variables, no access recording as they are always available
    chainId: 0,
    timestamp: 0,
    deployer: viem.zeroAddress,
    package: { version: '0.0.0' },
    ...fakeHelperContext,

    // Add access recorders for the base context variables, these are the ones
    // used to calculate dependencies beween steps
    contracts: new AccessRecorder(),
    imports: new AccessRecorder(),
    extras: new AccessRecorder(),
    txns: new AccessRecorder(),
    // For settings, we give it a zeroAddress as a best case scenarion that is going
    // to be working for most cases.
    // e.g., when calculating a setting value for 'settings.owners.split(',')' or 'settings.someNumber' will work.
    settings: new AccessRecorder(viem.zeroAddress),
  };

  // add possible names
  for (const n of possibleNames) {
    recorders[n] = new AccessRecorder();
  }

  return recorders;
}

export function _createDeepNoopObject<T>(obj: T): T {
  if (_.isFunction(obj)) {
    return _.noop as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => _createDeepNoopObject(item)) as T;
  }

  if (_.isPlainObject(obj)) {
    return _.mapValues(obj as Record<string, unknown>, (value) => _createDeepNoopObject(value)) as T;
  }

  return obj;
}

/**
 * Collect the accesses from the recorders.
 * @param recorders - The recorders to collect accesses from
 * @param possibleNames - The possible names to collect accesses from
 * @returns The accesses
 */
function collectAccesses(recorders: TemplateContext, possibleNames: string[]): string[] {
  const accesses: string[] = [];

  for (const recorder of Object.keys(recorders)) {
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
