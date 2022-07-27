import os from 'os';
import { resolve } from 'path';
import { findPackage } from '../helpers';
export async function deploy(cannonDirectory: string, packageRef: string) {
  cannonDirectory = resolve(cannonDirectory.replace(/^~(?=$|\/|\\)/, os.homedir()));
  const { name, version } = findPackage(cannonDirectory, packageRef);

  // See https://book.getfoundry.sh/forge/deploying
  // This may be very different logic between hardhat and foundry.
}
