import Debug from 'debug';
import { ethers } from 'ethers';
import _ from 'lodash';

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

export function computeTemplateAccesses(str?: string) {
  if (!str) {
    return [];
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
      ...ethers.constants,
      ...ethers.utils,
    },
  });

  try {
    baseTemplate();
  } catch (err) {
    debug('encountered error while parsing template for dependencies:', err);
    debug(
      'usually this happens because the access recorder is getting passed into a function that expects certain types. If you are finding some of your dependencies are not being resolved, please add them manually to `depends`.'
    );
  }

  const accesses: string[] = [];

  for (const recorder of Object.keys(recorders)) {
    accesses.push(...Array.from(recorders[recorder].accessed.keys()).map((a: string) => `${recorder}.${a}`));
  }

  return accesses;
}
