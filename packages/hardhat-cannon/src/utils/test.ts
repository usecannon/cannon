/* eslint-env mocha */

import hre from 'hardhat';

export function createSnapshot() {
  return (hre as any).ethers.provider.send('evm_snapshot', []) as unknown as string;
}

export function restoreSnapshot(snapshotId: string) {
  return (hre as any).ethers.provider.send('evm_revert', [snapshotId]);
}

export function snapshotCheckpoint() {
  let snapshotId: string;

  before('create snapshot', async function () {
    snapshotId = await createSnapshot();
  });

  after('restore snapshot', async function () {
    await restoreSnapshot(snapshotId);
  });
}
