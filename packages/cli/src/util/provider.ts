import { CannonWrapperGenericProvider } from '@usecannon/builder';
import { bold, red } from 'chalk';
import Debug from 'debug';
import provider from 'eth-provider';
import { ethers } from 'ethers';
import { timeout } from 'promise-timeout';
import os from 'os';
import { CliSettings } from '../settings';

const debug = Debug('cannon:cli:provider');

const RPC_PROVIDER_TIMEOUT = 5000;

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
    rawProvider.setChain(Number.parseInt(chainId.toString())); // its important here we ensure chainId is a number
  } catch (err) {
    console.error(`Failed to use chain id ${chainId}`, err);
    throw err;
  }

  let wrappedEthersProvider: CannonWrapperGenericProvider;

  // TODO: if at any point we let users provide multiple urls, this will have to be changed.
  // force provider to use JSON-RPC instead of Web3Provider for local http urls
  const signers = [];
  if (checkProviders[0].startsWith('http')) {
    debug('use explicit provider url', checkProviders);
    try {
      const _provider = new ethers.providers.JsonRpcProvider(checkProviders[0]);

      // `ready` will throw an error if it can't connect, so we can try the next rpc url
      await timeout(_provider.ready, RPC_PROVIDER_TIMEOUT);

      wrappedEthersProvider = new CannonWrapperGenericProvider({}, _provider, false);
    } catch (err: any) {
      if (checkProviders.length <= 1) {
        throw new Error('no more providers');
      }

      return await resolveProviderAndSigners({
        chainId,
        checkProviders: checkProviders.slice(1),
        privateKey,
      });
    }

    if (privateKey) {
      signers.push(...privateKey.split(',').map((k: string) => new ethers.Wallet(k).connect(wrappedEthersProvider)));
    } else {
      debug('no signer supplied for provider');
    }
  } else {
    debug('use frame eth provider');
    // Use eth-provider wrapped in Web3Provider as default
    wrappedEthersProvider = new CannonWrapperGenericProvider(
      {},
      new ethers.providers.Web3Provider(rawProvider as any),
      false
    );
    try {
      // Attempt to load from eth-provider
      await rawProvider.enable();
      for (const account of rawProvider.accounts) {
        signers.push(wrappedEthersProvider.getSigner(account));
      }
    } catch (err: any) {
      // try to do it with the next provider instead
      try {
        if (checkProviders.length <= 1) {
          throw new Error('no more providers');
        }

        return await resolveProviderAndSigners({
          chainId,
          checkProviders: checkProviders.slice(1),
          privateKey,
        });
      } catch (e: any) {
        console.error(red('Failed to connect signers: ', (err.stack as string)?.replace(os.homedir(), '')));
        console.error();
        console.error(
          'Please ensure your wallet application is open, a wallet is selected, and the wallet is granting access to cannon.'
        );
        console.error();
        console.error(
          'Alternatively, you can supply a private key and RPC in the terminal by setting CANNON_PROVIDER_URL and CANNON_PRIVATE_KEY.'
        );
        process.exit(1);
      }
    }
  }

  debug(`returning ${signers.length && (await signers[0].getAddress())} signers`);

  return {
    provider: wrappedEthersProvider,
    signers,
  };
}
