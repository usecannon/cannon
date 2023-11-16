import { CannonWrapperGenericProvider } from '@usecannon/builder';
import { bold } from 'chalk';
import Debug from 'debug';
import provider from 'eth-provider';
import { ethers } from 'ethers';
import os from 'os';
import { DEFAULT_REGISTRY_PROVIDER_URL } from '../constants';
import { CliSettings } from '../settings';

const debug = Debug('cannon:cli:provider');

export async function resolveWriteProvider(settings: CliSettings, chainId: number | string) {
  if (settings.providerUrl.split(',')[0] == 'frame' && !settings.quiet) {
    console.warn(
      "\nUsing Frame as the default provider. If you don't have Frame installed, Cannon defaults to http://localhost:8545."
    );
    console.warn(
      `Set a custom provider url in your settings (run ${bold('cannon setup')}) or pass it as an env variable (${bold(
        'CANNON_PROVIDER_URL'
      )}).\n\n`
    );
  }

  return resolveProviderAndSigners({
    chainId,
    checkProviders: settings.providerUrl.split(','),
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
  debug(
    'resolving provider',
    checkProviders.map((p) => (p ? p.replace(RegExp(/[=A-Za-z0-9_-]{32,}/), '*'.repeat(32)) : p)),
    chainId
  );

  const rawProvider = provider(checkProviders, { origin: 'Cannon' });

  // ensure provider is enabled and on the chain we expect
  try {
    await rawProvider.setChain(Number.parseInt(chainId.toString())); // its important here we ensure chainId is a number
  } catch (err) {
    console.error(`Failed to use chain id ${chainId}`, err);
    throw err;
  }

  let ethersProvider;

  // TODO: if at any point we let users provide multiple urls, this will have to be changed.
  // force provider to use JSON-RPC instead of Web3Provider for local http urls
  if (checkProviders[0].startsWith('http')) {
    ethersProvider = new ethers.providers.JsonRpcProvider(checkProviders[0]);
  } else {
    // Use eth-provider wrapped in Web3Provider as default
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
      debug('Failed to connect signers: ', (err.stack as string)?.replace(os.homedir(), ''));
    }
  }

  return {
    provider: wrappedEthersProvider,
    signers,
  };
}
