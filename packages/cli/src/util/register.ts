import * as viem from 'viem';
import { green } from 'chalk';
import { optimism } from 'viem/chains';
import { CannonSigner, OnChainRegistry, PackageReference } from '@usecannon/builder';

import { DEFAULT_REGISTRY_ADDRESS } from '../constants';

/**
 * Checks if a package is registered on a registry provider.
 *
 * @param {Object[]} registryProviders - An array of objects containing viem.PublicClient and array of CannonSigner.
 * @param {string} packageRef - The reference string of the package to check.
 * @param {viem.Address} contractAddress - Target registry address
 * @returns {Promise<boolean[]>} - A promise that resolves to an array of booleans, each indicating if the package is registered in the corresponding registry.
 */
export const isPackageRegistered = async (
  registryProviders: { provider: viem.PublicClient; signers: CannonSigner[] },
  packageRef: string,
  contractAddress: viem.Address
) => {
  const onChainRegistry = new OnChainRegistry({
    signer: registryProviders.signers[0],
    provider: registryProviders.provider,
    address: contractAddress,
  });

  const packageName = new PackageReference(packageRef).name;
  const packageOwner = await onChainRegistry.getPackageOwner(packageName);

  return !viem.isAddressEqual(packageOwner, viem.zeroAddress);
};

/**
 * Waits until a PackageOwnerChanged event is emitted for a package registration, or times out.
 *
 * @returns {Promise<void>} - A promise that resolves when the event is received or rejects on timeout.
 */
export const waitUntilPackageIsRegistered = () => {
  const event = viem.parseAbiItem('event PackageOwnerChanged(bytes32 _packageName, address _owner)');

  const client = viem.createPublicClient({
    chain: optimism,
    transport: viem.http(),
  });

  let timeoutId: ReturnType<typeof setTimeout>;

  return new Promise((resolve, reject) => {
    const onTimeout = () => reject(new Error('Timed out waiting for package to be confirmed'));

    // Start watching for the event to confirm the package registration on OP Registry
    const unwatch = client.watchEvent({
      address: DEFAULT_REGISTRY_ADDRESS,
      event,
      onLogs: async (logs) => {
        console.log(green('The package is confirmed on OP Cannon Registry successfully.'));
        // unwatch the event
        unwatch();
        // Clear the timeout
        clearTimeout(timeoutId);
        // Resolve the promise
        resolve(logs);
      },
      onError: (err) => {
        // unwatch the event
        unwatch();
        // Clear the timeout
        clearTimeout(timeoutId);
        // Reject the promise
        reject(new Error(`Error watching for package registration event: ${err}`));
      },
    });

    // Set the timeout and store its id for cancellation
    // Docs say that the timeout should be max 3 minutes, but we add an extra minute to be safe
    // Ref: https://docs.optimism.io/builders/app-developers/bridging/messaging#for-l1-to-l2-transactions
    const waitTime = 180000 + 60000;
    timeoutId = setTimeout(onTimeout, waitTime);
  });
};
