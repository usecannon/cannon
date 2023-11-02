import deepEqual from 'fast-deep-equal';

export function includes(arr: unknown[], value: unknown) {
  return arr.some((v) => deepEqual(v, value));
}
