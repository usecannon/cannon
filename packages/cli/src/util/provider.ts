import { ethers } from 'ethers';

import provider from 'eth-provider';
import { CannonWrapperGenericProvider } from '@usecannon/builder';
import { DEFAULT_REGISTRY_PROVIDER_URL } from '../constants';

import { bold } from 'chalk';

import Debug from 'debug';
import os from 'os';
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
  if (settings.registryProviderUrl!.split(',')[0] == 'frame' && !settings.quiet) {
    console.warn(
      `\nUsing Frame as the default registry provider. If you don't have Frame installed cannon defaults to: ${DEFAULT_REGISTRY_PROVIDER_URL}`
    );
    console.warn(
      `Set a custom registry provider url in your settings (run ${bold(
        'cannon setup'
      )}) or pass it as an env variable (${bold('CANNON_REGISTRY_PROVIDER_URL')}).\n\n`
    );
  }

  return resolveProviderAndSigners({
    chainId: settings.registryChainId,
    checkProviders: settings.registryProviderUrl!.split(','),
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
  debug('resolving provider', checkProviders.map(p => p.replace(RegExp(/[=A-Za-z0-9, '*'.repeat(32))_-]{32,}/), '*'.repeat(32))), chainId);

  const rawProvider = provider(checkProviders, { origin: 'Cannon' });

  // ensure provider is enabled and on the chain we expect
  try {
    await rawProvider.setChain(Number.parseInt(chainId.toString())); // its important here we ensure chainId is a number
  } catch (err) {
    console.error(`Failed to use chain id ${chainId}`, err);
    throw err;
  }

  const ethersProvider = new CannonWrapperGenericProvider({}, new ethers.providers.Web3Provider(rawProvider as any), false);

  const signers = [];

  // Use private key if provided
  if (privateKey) {
    signers.push(...privateKey.split(',').map((k: string) => new ethers.Wallet(k).connect(ethersProvider)));
  } else {
    try {
      // Attempt to load from eth-provider
      await rawProvider.enable();
      for (const account of rawProvider.accounts) {
        signers.push(ethersProvider.getSigner(account));
      }
    } catch (err: any) {
      debug('Failed to connect signers: ', (err.stack as string).replace(os.homedir(), ''));
    }
  }

  return {
    provider: ethersProvider,
    signers,
  };
}
