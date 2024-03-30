import Debug from 'debug';
import * as viem from 'viem';
import { bold, red, grey } from 'chalk';
import provider from 'eth-provider';
import { privateKeyToAccount } from 'viem/accounts';
import { CannonSigner, traceActions } from '@usecannon/builder';

import { getChainById } from '../chains';
import { CliSettings } from '../settings';

const debug = Debug('cannon:cli:provider');

export function normalizePrivateKey(pkey: string): viem.Hash {
  return (pkey.startsWith('0x') ? pkey : `0x${pkey}`) as viem.Hash;
}

enum ProviderOrigin {
  Registry = 'registry',
  Write = 'write',
}

export async function resolveWriteProvider(
  settings: CliSettings,
  chainId: number
): Promise<{ provider: viem.PublicClient & viem.WalletClient; signers: CannonSigner[] }> {
  // Check if the first provider URL doesn't start with 'http'
  if (!settings.providerUrl.split(',')[0].startsWith('http')) {
    const chainData = getChainById(chainId);

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

  if (settings.providerUrl.split(',')[0] === 'frame' && !settings.quiet) {
    console.warn(
      "\nUsing Frame as the default provider. If you don't have Frame installed, Cannon defaults first to http://localhost:8545, then to Viem's default RPCs.\n\n"
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
    origin: ProviderOrigin.Write,
  }) as any;
}

export async function resolveRegistryProviders(
  settings: CliSettings
): Promise<{ provider: viem.PublicClient; signers: CannonSigner[] }[]> {
  const resolvedProviders = [];
  for (const registryInfo of settings.registries) {
    resolvedProviders.push(
      await resolveProviderAndSigners({
        chainId: registryInfo.chainId,
        checkProviders: registryInfo.providerUrl,
        privateKey: settings.privateKey,
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
  if (origin === ProviderOrigin.Write) {
    console.log(grey(`Initiating connection attempt to: ${bold(checkProviders[0])}`));
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
  if (checkProviders[0].startsWith('http')) {
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
          const account = privateKeyToAccount(normalizePrivateKey(k));
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
