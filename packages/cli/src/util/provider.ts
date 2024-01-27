import { bold, red } from 'chalk';
import Debug from 'debug';
import provider from 'eth-provider';
import * as viem from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import os from 'os';
import { CliSettings } from '../settings';
import { CannonSigner } from '@usecannon/builder';
import { getChainById } from '../chains';

const debug = Debug('cannon:cli:provider');

export async function resolveWriteProvider(
  settings: CliSettings,
  chainId: number
): Promise<{ provider: viem.PublicClient & viem.WalletClient; signers: CannonSigner[] }> {
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
  }) as any;
}

export async function resolveRegistryProvider(
  settings: CliSettings
): Promise<{ provider: viem.PublicClient; signers: CannonSigner[] }> {
  return resolveProviderAndSigners({
    chainId: parseInt(settings.registryChainId),
    checkProviders: settings.registryProviderUrl?.split(','),
    privateKey: settings.privateKey,
  });
}

export async function resolveProviderAndSigners({
  chainId,
  checkProviders = ['frame'],
  privateKey,
}: {
  chainId: number;
  checkProviders?: string[];
  privateKey?: string;
}): Promise<{ provider: viem.PublicClient; signers: CannonSigner[] }> {
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

  let publicClient: viem.PublicClient;

  // TODO: if at any point we let users provide multiple urls, this will have to be changed.
  // force provider to use JSON-RPC instead of Web3Provider for local http urls
  const signers: CannonSigner[] = [];
  if (checkProviders[0].startsWith('http')) {
    debug('use explicit provider url', checkProviders);
    publicClient = viem.createPublicClient({
      chain: getChainById(chainId),
      transport: viem.http(checkProviders[0]),
    });

    if (privateKey) {
      signers.push(
        ...privateKey.split(',').map((k: string) => {
          const account = privateKeyToAccount(k as viem.Hash);
          return {
            address: account.address,
            wallet: viem.createWalletClient({
              account,
              chain: getChainById(chainId),
              transport: viem.custom(publicClient.transport),
            }),
          };
        })
      );
    } else {
      debug('no signer supplied for provider');
    }
  } else {
    debug('use frame eth provider');
    // Use eth-provider wrapped in Web3Provider as default
    publicClient = viem
      .createPublicClient({
        transport: viem.custom(rawProvider),
      })
      .extend(viem.walletActions);
    try {
      // Attempt to load from eth-provider
      await rawProvider.enable();

      for (const address of rawProvider.accounts) {
        signers.push({
          address: address as viem.Address,
          wallet: publicClient as unknown as viem.WalletClient,
        });
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

  debug(`returning ${signers.length && signers[0].address} signers`);

  return {
    provider: publicClient,
    signers,
  };
}
