import { CannonSigner, OnChainRegistry, PackageReference, DEFAULT_REGISTRY_ADDRESS } from '@usecannon/builder';
import * as viem from 'viem';
import _ from 'lodash';
import { getChainById } from '../chains';

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

/**
 * Waits until for a specific event on the Cannon Registry or a timeout occurs.
 *
 * @param {string} params.eventName - The name of the event to wait for.
 * @param {viem.Abi} params.abi - The ABI (Application Binary Interface) that includes the event.
 * @param {number} params.chainId - The chain ID of the registry.
 * @param {any} params.expectedArgs - The expected arguments of the event.
 * @returns {Promise<void>} - A promise that resolves with the event logs when the event is received or rejects with an error on timeout or if an error occurs while watching the event.
 */

export const waitForEvent = ({
  eventName,
  abi,
  chainId,
  expectedArgs,
}: {
  eventName: string;
  abi: viem.Abi;
  chainId: number;
  expectedArgs: any;
}) => {
  const event = viem.getAbiItem({ abi, name: eventName }) as viem.AbiEvent;

  const chain = getChainById(chainId);

  const client = viem.createPublicClient({
    chain,
    transport: viem.http(),
  });

  let timeoutId: ReturnType<typeof setTimeout>;

  return new Promise((resolve, reject) => {
    const onTimeout = () => reject(new Error(`Timed out waiting for ${eventName} event`));

    // Start watching for the event
    const unwatch = client.watchEvent({
      address: DEFAULT_REGISTRY_ADDRESS,
      event,
      onLogs: async (logs) => {
        const topics = viem.parseEventLogs({ abi, eventName, logs });

        for (const topic of topics) {
          // check event arguments, early return if they don't match
          if (!_.isEqual(topic.args, expectedArgs)) continue;

          // unwatch the event
          unwatch();
          // Clear the timeout
          clearTimeout(timeoutId);
          // Resolve the promise
          resolve(logs);
        }
      },
      onError: (err) => {
        // unwatch the event
        unwatch();
        // Clear the timeout
        clearTimeout(timeoutId);
        // Reject the promise
        reject(new Error(`Error watching for ${eventName} event: ${err}`));
      },
    });

    // Set the timeout and store its id for cancellation
    // Docs say that the timeout should be max 3 minutes, but we add 2 extra minutes to be safe
    // Ref: https://docs.optimism.io/builders/app-developers/bridging/messaging#for-l1-to-l2-transactions
    const waitTime = 180000 + 120000; // 3 + 2 = 5 minutes
    timeoutId = setTimeout(onTimeout, waitTime);
  });
};
