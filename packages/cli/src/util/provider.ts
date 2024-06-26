import Debug from 'debug';
import * as viem from 'viem';
import { bold, red, grey } from 'chalk';
import provider from 'eth-provider';
import { privateKeyToAccount } from 'viem/accounts';
import { CannonSigner, traceActions } from '@usecannon/builder';

import { getChainById } from '../chains';
import { CliSettings, PROVIDER_URL_DEFAULT } from '../settings';

const debug = Debug('cannon:cli:provider');

export enum ProviderOrigin {
  Registry = 'registry',
  Write = 'write',
}

export const isURL = (url: string): boolean => {
  try {
    const tmpUrl = new URL(url);
    return ['http:', 'https:'].includes(tmpUrl.protocol);
  } catch {
    return false;
  }
};

export const getChainIdFromProviderUrl = async (providerUrl: string) => {
  if (!isURL(providerUrl)) throw new Error('Provider URL has not a valid format');

  const provider = viem.createPublicClient({ transport: viem.http(providerUrl) });
  return provider.getChainId();
};

export async function resolveWriteProvider(
  settings: CliSettings,
  chainId: number
): Promise<{ provider: viem.PublicClient & viem.WalletClient; signers: CannonSigner[] }> {
  const chainData = getChainById(chainId);
  console.log(bold(`Resolving connection to ${getChainById(chainId)} (Chain ID: ${chainId})...`));
  // Check if the first provider URL doesn't start with 'http'
  const isProviderUrl = isURL(settings.providerUrl.split(',')[0]);

  if (!isProviderUrl) {
    // If privateKey is present or no valid http URLs are available in rpcUrls
    if (settings.privateKey || chainData.rpcUrls.default.http.length === 0) {
      if (chainData.rpcUrls.default.http.length === 0) {
        console.error(
          red(
            `Failed to establish a connection with any provider. Please specify a valid RPC url using the ${bold(
              '--provider-url'
            )} flag.`
          )
        );
        process.exit(1);
      }
      // Use default http URLs from chainData
      settings.providerUrl = chainData.rpcUrls.default.http.join(',');
    } else {
      // Merge with viem's default rpc URLs, remove duplicates
      const providers = [...new Set([...settings.providerUrl.split(','), ...chainData.rpcUrls.default.http])];
      settings.providerUrl = providers.join(',');
    }
  }

  if (settings.providerUrl == PROVIDER_URL_DEFAULT && !settings.quiet) {
    console.warn(grey('Set a RPC URL by passing --provider-url or setting the ENV variable CANNON_PROVIDER_URL.\n'));
  }

  return resolveProviderAndSigners({
    chainId,
    checkProviders: settings.providerUrl.split(','),
    privateKey: settings.privateKey,
    origin: ProviderOrigin.Write,
  }) as any;
}

export async function resolveRegistryProviders(
  cliSettings: CliSettings
): Promise<{ provider: viem.PublicClient; signers: CannonSigner[] }[]> {
  const resolvedProviders = [];
  for (const registryInfo of cliSettings.registries) {
    resolvedProviders.push(
      await resolveProviderAndSigners({
        chainId: registryInfo.chainId!,
        checkProviders: registryInfo.providerUrl,
        privateKey: cliSettings.privateKey,
        origin: ProviderOrigin.Registry,
      })
    );
  }

  return resolvedProviders;
}

export async function resolveProviderAndSigners({
  chainId,
  checkProviders = ['frame'],
  privateKey,
  origin,
}: {
  chainId: number;
  checkProviders?: string[];
  privateKey?: string;
  origin: ProviderOrigin;
}): Promise<{ provider: viem.PublicClient; signers: CannonSigner[] }> {
  const providerDisplayName = (provider: string) => {
    switch (provider) {
      case 'frame':
        return 'Frame (frame.sh) if running';
      case 'direct':
        return 'default IPC paths, ws://127.0.0.1:8546, or http://127.0.0.1:8545';
      default:
        return provider;
    }
  };

  if (origin === ProviderOrigin.Write) {
    console.log(grey(`Attempting to find connection via ${bold(providerDisplayName(checkProviders[0]))}`));
    if (checkProviders.length === 1) console.log('');
  }

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
  if (isURL(checkProviders[0])) {
    debug(
      'use explicit provider url',
      checkProviders.map((p) => (p ? p.replace(RegExp(/[=A-Za-z0-9_-]{32,}/), '*'.repeat(32)) : p))
    );
    try {
      publicClient = (
        viem.createPublicClient({
          chain: getChainById(chainId),
          transport: viem.http(checkProviders[0]),
        }) as any
      ).extend(traceActions({}));
    } catch (err) {
      if (checkProviders.length <= 1) {
        console.error(
          red(
            `Failed to establish a connection with any provider. Please specify a valid RPC url using the ${bold(
              '--provider-url'
            )} flag.`
          )
        );
        process.exit(1);
      }

      return await resolveProviderAndSigners({
        chainId,
        checkProviders: checkProviders.slice(1),
        privateKey,
        origin,
      });
    }

    if (privateKey) {
      signers.push(
        ...privateKey.split(',').map((k: string) => {
          const account = privateKeyToAccount(k as viem.Hex);
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
    try {
      publicClient = (
        viem
          .createPublicClient({
            chain: getChainById(chainId),
            transport: viem.custom(rawProvider),
          })
          .extend(viem.walletActions) as any
      ).extend(traceActions({}));

      // Attempt to load from eth-provider
      await rawProvider.enable();

      for (const address of rawProvider.accounts) {
        signers.push({
          address: address as viem.Address,
          wallet: publicClient as unknown as viem.WalletClient,
        });
      }
    } catch (err: any) {
      if (checkProviders.length <= 1) {
        console.error(
          red(
            `Failed to establish a connection with any provider. Please specify a valid RPC url using the ${bold(
              '--provider-url'
            )} flag.`
          )
        );
        process.exit(1);
      }

      return await resolveProviderAndSigners({
        chainId,
        checkProviders: checkProviders.slice(1),
        privateKey,
        origin,
      });
    }
  }

  debug(`returning ${signers.length && signers[0].address} signers`);

  return {
    provider: publicClient,
    signers,
  };
}
