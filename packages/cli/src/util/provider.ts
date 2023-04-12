import { ethers } from 'ethers';

import provider from 'eth-provider';
import { CliSettings } from '../settings';
import { CannonWrapperGenericProvider } from '@usecannon/builder';

export async function resolveProviderAndSigners(
  cliSettings: CliSettings,
  chainId: number
): Promise<{ provider: CannonWrapperGenericProvider; signers: ethers.Signer[] }> {
  const checkProviders = ['frame', 'direct'];

  if (cliSettings.providerUrl) {
    checkProviders.unshift(cliSettings.providerUrl);
  }

  const rawProvider = provider(checkProviders, { origin: 'Cannon' });

  // ensure provider is enabled and on the chain we expect
  try {
    await rawProvider.setChain(parseInt(chainId.toString())); // its important here we ensure chainId is a number
  } catch (err) {
    console.error(`Failed to use chain id ${chainId}`, err);
    throw err;
  }

  const ethersProvider = new CannonWrapperGenericProvider({}, new ethers.providers.Web3Provider(rawProvider as any), false);

  const signers = [];

  if (cliSettings.privateKey) {
    signers.push(...cliSettings.privateKey.split(',').map((k: string) => new ethers.Wallet(k).connect(ethersProvider)));
  } else {
    try {
      await rawProvider.enable();
    } catch (err) {
      console.error('Failed to connect signers:', err);
      throw err;
    }

    for (const account of rawProvider.accounts) {
      signers.push(ethersProvider.getSigner(account));
    }
  }

  return {
    provider: ethersProvider,
    signers,
  };
}
