import { TestContext } from 'node:test';
import { AxiosResponse } from 'axios';

export function assertRes(t: TestContext, res: AxiosResponse, expected: Partial<AxiosResponse>) {
  const keys = Object.keys(expected) as (keyof AxiosResponse)[];
  const actual = pick(res, keys);
  t.assert.deepStrictEqual(actual, expected);
}

function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {} as Pick<T, K>);
}
