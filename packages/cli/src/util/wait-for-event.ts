import _ from 'lodash';
import * as viem from 'viem';
import { DEFAULT_REGISTRY_ADDRESS } from '@usecannon/builder';

type WaitForEventProps = {
  eventName: string;
  abi: viem.Abi;
  rpcUrl: string;
  expectedArgs: any;
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

export const waitForEvent = ({ eventName, abi, rpcUrl, expectedArgs }: WaitForEventProps) => {
  const event = viem.getAbiItem({ abi, name: eventName }) as viem.AbiEvent;

  const client = viem.createPublicClient({
    transport: viem.http(rpcUrl),
  });

  let timeoutId: ReturnType<typeof setTimeout>;

  return new Promise((resolve, reject) => {
    const onTimeout = () => reject(new Error(`Timed out waiting for ${eventName} event`));

    // start watching for the event
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
          // clear the timeout
          clearTimeout(timeoutId);
          // resolve the promise
          resolve(logs);
        }
      },
      onError: (err) => {
        // unwatch the event
        unwatch();
        // clear the timeout
        clearTimeout(timeoutId);
        // reject the promise
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
