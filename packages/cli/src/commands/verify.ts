import { CannonWrapperGenericProvider, ChainBuilder } from '@usecannon/builder';
import untildify from 'untildify';
import { getChainId, setupAnvil, execPromise } from '../helpers';
import { parsePackageRef } from '../util/params';

export async function verify(packageRef: string, apiKey: string, network: string, cannonDirectory: string) {
  await setupAnvil();
  const { name, version } = parsePackageRef(packageRef);
  cannonDirectory = untildify(cannonDirectory);
  const chainId = getChainId(network);

  const builder = new ChainBuilder({
    name,
    version,
    readMode: 'metadata',
    chainId: chainId,
    savedPackagesDir: cannonDirectory,

    provider: {} as CannonWrapperGenericProvider,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getSigner(_: string) {
      return new Promise(() => {
        return null;
      });
    },
  });

  const outputs = await builder.getOutputs();

  if (!outputs) {
    throw new Error('No chain outputs found. Has the requested chain already been built?');
  }

  for (const c in outputs.contracts) {
    console.log('Verifying contract:', c);
    try {
      const constructorArgs = outputs.contracts[c].constructorArgs?.map((arg) => `"${arg}"`).join(' '); // might need to prepend the constructor signature
      await execPromise(
        `forge verify-contract --chain-id ${chainId} --constructor-args $(cast abi-encode ${constructorArgs} ${outputs.contracts[c].address} ${outputs.contracts[c].sourceName}:${outputs.contracts[c].contractName} ${apiKey}`
      );
    } catch (err) {
      if ((err as Error).message.includes('Already Verified')) {
        console.log('Already verified');
      } else {
        throw err;
      }
    }
  }
}
