import Debug from 'debug';
import _ from 'lodash';
import * as viem from 'viem';
import { template } from './utils/template';
import { CannonHelperContext } from './types';

const debug = Debug('cannon:builder:access-recorder');

class ExtendableProxy {
  accessed = new Map<string, AccessRecorder>();

  constructor(defaultValue?: any) {
    return new Proxy(this, {
      get: (obj: any, prop: string) => {
        if (prop === 'accessed' || prop === 'getAccesses' || prop === 'clearAccesses') {
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
          .map((a) => `${k}.${a}`),
      );
    }

    return acc;
  }

  clearAccesses(depth: number, cur = 1) {
    if (cur == depth) {
      return Array.from(this.accessed.keys());
    }

    for (const k in this.accessed.keys()) {
      this.accessed.get(k)!.clearAccesses(depth, (cur || 1) + 1);
    }

    this.accessed.clear();
  }
}

export type AccessComputationResult = { accesses: string[]; unableToCompute: boolean };

type AccessRecorderMap = { [k: string]: AccessRecorder };

type TemplateContextData = {
  [k: string]: AccessRecorder | AccessRecorderMap | unknown;
};

export class TemplateContext {
  readonly possibleNames: string[];
  readonly recorders: TemplateContextData;

  constructor(
    overrides: { chainId: number; timestamp: number; package: { version: string } },
    possibleNames: string[] = [],
  ) {
    // Create a fake helper context, so the render works but no real functions are called
    const fakeHelperContext = _createDeepNoopObject(CannonHelperContext);

    this.possibleNames = possibleNames;
    this.recorders = {
      // Include base context variables, no access recording as they are always available
      chainId: overrides.chainId,
      timestamp: overrides.timestamp,
      package: overrides.package,
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
      this.recorders[n] = new AccessRecorder();
    }
  }

  computeAccesses(str?: string) {
    if (!str) {
      return { accesses: [], unableToCompute: false };
    }

    try {
      // we give it "true" for safeContext to avoid cloning and freezing of the object
      // this is because we want to keep the access recorder, and is not a security risk
      // if the user can modify that object
      template(str, this.recorders, true);
      const accesses = this.collectAccesses();
      return { accesses, unableToCompute: false };
    } catch (err) {
      debug('Template execution failed:', err);
      return { accesses: [], unableToCompute: true };
    }
  }

  /**
   * Collect the accesses from the recorders.
   * @param recorders - The recorders to collect accesses from
   * @param possibleNames - The possible names to collect accesses from
   * @returns The accesses
   */
  collectAccesses(): string[] {
    const accesses: string[] = [];

    for (const recorder of Object.keys(this.recorders)) {
      if (this.recorders[recorder] instanceof AccessRecorder) {
        if (this.possibleNames.includes(recorder) && this.recorders[recorder].accessed.size > 0) {
          accesses.push(recorder);
        } else {
          accesses.push(...Array.from(this.recorders[recorder].accessed.keys()).map((a: string) => `${recorder}.${a}`));
        }
        this.recorders[recorder].clearAccesses(2);
      }
    }

    return accesses;
  }
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
