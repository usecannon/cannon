import { CannonSigner, OnChainRegistry, PackageReference } from '@usecannon/builder';
import * as viem from 'viem';

/**
 * Checks if a package is registered on a registry provider.
 *
 * @param {Object[]} registryProviders - An array of objects containing viem.PublicClient and array of CannonSigner.
 * @param {string} packageRef - The reference string of the package to check.
 * @param {viem.Address} contractAddress - Target registry address
 * @returns {Promise<boolean[]>} - A promise that resolves to an array of booleans, each indicating if the package is registered in the corresponding registry.
 */
export const isPackageRegistered = async (
  registryProviders: { provider: viem.PublicClient; signers: CannonSigner[] }[],
  packageRef: string,
  contractAddress: viem.Address[]
) => {
  const packageName = new PackageReference(packageRef).name;


  if (contractAddress.length !== registryProviders.length) {
    throw new Error('Registry providers and contract addresses must have the same length.');
  }

  const onChainRegistries = registryProviders.map(
    ({ provider, signers }, index) =>
      new OnChainRegistry({
        signer: signers[0],
        provider,
        address: contractAddress[index],
      })
  );

  const packageOwners = await Promise.all(
    onChainRegistries.map((onChainRegistry) => onChainRegistry.getPackageOwner(packageName))
  );


  return !packageOwners.some((address) => viem.isAddressEqual(address, viem.zeroAddress));
};
