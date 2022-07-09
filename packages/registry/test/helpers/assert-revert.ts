import { rejects } from 'assert/strict';

export default async function assertRevert(
  fn: () => Promise<unknown>,
  errorMessage: string
) {
  await rejects(fn, {
    message: `VM Exception while processing transaction: reverted with custom error '${errorMessage}'`,
  });
}
