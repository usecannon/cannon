import * as viem from 'viem';
import { CannonSigner, OnChainRegistry, PackageReference } from '@usecannon/builder';
import { CliSettings } from '../settings';

export const checkIfPackageIsRegistered = async (
  registryProviders: { provider: viem.PublicClient; signers: CannonSigner[] }[],
  packageRef: string,
  cliSettings: CliSettings
) => {
  return Promise.all(
    registryProviders.map(async (provider, index) => {
      const onChainRegistry = new OnChainRegistry({
        signer: provider.signers[0],
        provider: provider.provider,
        address: cliSettings.registries[index].address,
      });

      const packageName = new PackageReference(packageRef).name;
      const packageOwner = await onChainRegistry.getPackageOwner(packageName);

      return !viem.isAddressEqual(packageOwner, viem.zeroAddress);
    })
  );
};
