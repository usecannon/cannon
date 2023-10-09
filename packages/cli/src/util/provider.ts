import { ethers } from 'ethers';

import provider from 'eth-provider';
import { CannonWrapperGenericProvider } from '@usecannon/builder';

import Debug from 'debug';
import { CliSettings } from '../settings';

const debug = Debug('cannon:cli:provider');

export async function resolveWriteProvider(settings: CliSettings, chainId: number | string) {
  return resolveProviderAndSigners({
    chainId,
    checkProviders: settings.providerUrl?.split(','),
    privateKey: settings.privateKey,
  });
}

export async function resolveRegistryProvider(settings: CliSettings) {
  return resolveProviderAndSigners({
    chainId: settings.registryChainId,
    checkProviders: settings.registryProviderUrl?.split(','),
    privateKey: settings.privateKey,
  });
}

export async function resolveProviderAndSigners({
  chainId,
  checkProviders = ['frame'],
  privateKey,
}: {
  chainId: number | string;
  checkProviders?: string[];
  privateKey?: string;
}): Promise<{ provider: CannonWrapperGenericProvider; signers: ethers.Signer[] }> {
  debug('resolving provider', checkProviders, chainId);
  const rawProvider = provider(checkProviders, { origin: 'Cannon' });

  // ensure provider is enabled and on the chain we expect
  try {
    await rawProvider.setChain(Number.parseInt(chainId.toString())); // its important here we ensure chainId is a number
  } catch (err) {
    console.error(`Failed to use chain id ${chainId}`, err);
    throw err;
  }

  const localProviders = {
    frame: 'http://127.0.0.1:1248',
    direct: 'http://127.0.0.1:8545',
  };

  let ethersProvider;
  const providerList = [];

  // force provider to use JSON-RPC instead of Web3Provider for local instances
  if (
    (checkProviders.includes('frame') || checkProviders[0].startsWith('http://')) &&
    Number.parseInt(chainId.toString()) === 13370
  ) {
    for (const provider in checkProviders) {
      providerList.push(new ethers.providers.JsonRpcProvider(localProviders[provider as keyof typeof localProviders]));
    }

    ethersProvider = new ethers.providers.FallbackProvider(providerList);
  } else {
    ethersProvider = new ethers.providers.Web3Provider(rawProvider as any);
  }

  const wrappedEthersProvider = new CannonWrapperGenericProvider({}, ethersProvider, false);

  const signers = [];

  // Use private key if provided
  if (privateKey) {
    signers.push(...privateKey.split(',').map((k: string) => new ethers.Wallet(k).connect(wrappedEthersProvider)));
  } else {
    try {
      // Attempt to load from eth-provider
      await rawProvider.enable();
      for (const account of rawProvider.accounts) {
        signers.push(wrappedEthersProvider.getSigner(account));
      }
    } catch (err: any) {
      debug('Failed to connect signers: ', err);
    }
  }

  return {
    provider: wrappedEthersProvider,
    signers,
  };
}
