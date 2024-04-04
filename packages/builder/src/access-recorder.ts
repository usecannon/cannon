import _ from 'lodash';
import { CannonHelperContext } from './types';

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
        return typeof prop === 'symbol' ? () => '' : this.accessed.get(prop);
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

export function computeTemplateAccesses(str?: string): AccessComputationResult {
  if (!str) {
    return { accesses: [], unableToCompute: false };
  }
  //const recorder = new AccessRecorder();
  const recorders: { [k: string]: AccessRecorder } = {
    contracts: new AccessRecorder(),
    imports: new AccessRecorder(),
    extras: new AccessRecorder(),
    txns: new AccessRecorder(),
    settings: new AccessRecorder(),
  };

  const baseTemplate = _.template(str, {
    imports: {
      ...recorders,
      // TODO: replace with cannon "standard template library" after the refactor
      // for now we are just using ethers so its fine to just put here
      ...CannonHelperContext,
    },
  });

  let unableToCompute = false;
  try {
    baseTemplate();
  } catch (err) {
    unableToCompute = true;
  }

  const accesses: string[] = [];

  for (const recorder of Object.keys(recorders)) {
    accesses.push(...Array.from(recorders[recorder].accessed.keys()).map((a: string) => `${recorder}.${a}`));
  }

  return { accesses, unableToCompute };
}

export function mergeTemplateAccesses(r1: AccessComputationResult, r2: AccessComputationResult): AccessComputationResult {
  return {
    accesses: [...r1.accesses, ...r2.accesses],
    unableToCompute: r1.unableToCompute || r2.unableToCompute,
  };
}
