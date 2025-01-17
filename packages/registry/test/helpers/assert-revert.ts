import { deepEqual, equal } from 'assert/strict';

export async function assertRevert(fn: () => Promise<unknown>, errorMessage: string) {
  const match = /([a-zA-Z0-9]+)\(([^)]*)\)/.exec(errorMessage);

  const errorName = match?.[1];
  const errorArgs = match?.[2] ? JSON.parse(`[${match[2]}]`) : [];

  try {
    await fn();
  } catch (err: any) {
    if (!match) {
      deepEqual(err, errorMessage);
    }

    if (err.message === `VM Exception while processing transaction: reverted with custom error '${errorMessage}'`) {
      return;
    }

    if (err.code === 'CALL_EXCEPTION') {
      equal(err.errorName, errorName);
      deepEqual(Array.from(err.errorArgs), errorArgs);
      return;
    }

    equal(err, errorMessage);
  }

  throw new Error(`Expected revert with error '${errorMessage}'`);
}
