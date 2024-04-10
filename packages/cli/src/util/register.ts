import _ from 'lodash';
import * as viem from 'viem';
import { optimism } from 'viem/chains';
import { CannonSigner, OnChainRegistry, PackageReference } from '@usecannon/builder';
import { CliSettings } from '../settings';
import { DEFAULT_REGISTRY_ADDRESS } from '../constants';

/**
 * Checks if a package is registered across multiple registry providers.
 *
 * @param {Object[]} registryProviders - An array of objects containing viem.PublicClient and array of CannonSigner.
 * @param {string} packageRef - The reference string of the package to check.
 * @param {CliSettings} cliSettings - CLI settings that include registry addresses.
 * @returns {Promise<boolean[]>} - A promise that resolves to an array of booleans, each indicating if the package is registered in the corresponding registry.
 */
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

/**
 * Waits until a PackageOwnerChanged event is emitted for a package registration, or times out.
 *
 * @returns {Promise<void>} - A promise that resolves when the event is received or rejects on timeout.
 */
export const waitUntilPackageIsRegistered = async () => {
  const event = viem.parseAbiItem('event PackageOwnerChanged(bytes32 _packageName, address _owner)');

  const client = viem.createPublicClient({
    chain: optimism,
    transport: viem.http(),
  });

  let timeoutId: ReturnType<typeof setTimeout>;

  await new Promise((resolve, reject) => {
    const onTimeout = () => reject(new Error('Timed out waiting for package to be registered'));

    // Start watching for the event
    client.watchEvent({
      address: DEFAULT_REGISTRY_ADDRESS,
      event,
      onLogs: (logs) => {
        // TODO: check values?
        console.log('logs: ', logs);
        // Clear the timeout
        clearTimeout(timeoutId);
        // Return the logs
        resolve(logs);
      },
    });

    // Set the timeout and store its id for cancellation
    timeoutId = setTimeout(onTimeout, 10000);
  });
};
