import { OnChainRegistry, PackageReference } from '@usecannon/builder';
import * as viem from 'viem';

interface Params {
  packageRef: string;
  mainRegistry: OnChainRegistry;
  skipConfirm?: boolean;
}

export async function register({ packageRef, mainRegistry }: Params) {
  const packageName = new PackageReference(packageRef).name;
  const packageOwner = await mainRegistry.getPackageOwner(packageName);

  if (!viem.isAddressEqual(packageOwner, viem.zeroAddress)) {
    throw new Error(`The package "${packageName}" is already registered by "${packageOwner}".`);
  }

  const hash = await mainRegistry.setPackageOwnership(packageName);

  return hash;
}
