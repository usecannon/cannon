import { findPackage } from '../helpers';
export async function deploy(packagesDir: string, packageRef: string) {
  const { name, version } = findPackage(packageRef);

  // See https://book.getfoundry.sh/forge/deploying
  // This may be very different logic between hardhat and foundry.
}
