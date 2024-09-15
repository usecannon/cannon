import Debug from 'debug';
import * as viem from 'viem';
import prompts from 'prompts';
import { bold, red, grey } from 'chalk';
import provider from 'eth-provider';
import { privateKeyToAccount } from 'viem/accounts';
import { CannonSigner, traceActions } from '@usecannon/builder';

import { log, error } from './console';
import { getChainById } from '../chains';
import { CliSettings } from '../settings';

const debug = Debug('cannon:cli:provider');

import { isPrivateKey, normalizePrivateKey } from '../helpers';

export enum ProviderAction {
  WriteDryRunProvider = 'WriteDryRunProvider',
  OptionalWriteProvider = 'OptionalWriteProvider',
  WriteProvider = 'WriteProvider',
  ReadProvider = 'ReadProvider',
}

type ProviderParams = {
  action: ProviderAction;
  quiet?: boolean;
  cliSettings: CliSettings;
  chainId?: number;
};

export const isURL = (url: string): boolean => {
  try {
    const tmpUrl = new URL(url);
    return ['http:', 'https:'].includes(tmpUrl.protocol);
  } catch {
    return false;
  }
};

export const hideApiKey = (rpcUrl: string) => {
  try {
    const parsedUrl = new URL(rpcUrl);
    const pathParts = parsedUrl.pathname.split('/');
    const queryParams = parsedUrl.searchParams;

    // function to mask a string
    const maskString = (key: string, visibleChars = 4) => {
      return key.length > visibleChars ? '*'.repeat(key.length - visibleChars) + key.slice(-visibleChars) : key;
    };

    // function to check if a string looks like a key or token
    const isLikelyKey = (key: string) => {
      // check for strings that look like keys, tokens, or hashes
      return /^[a-zA-Z0-9_-]+$/.test(key) && key.length > 8;
    };

    // check and mask path segments
    pathParts.forEach((part, index) => {
      if (isLikelyKey(part)) {
        pathParts[index] = maskString(part);
      }
    });

    // check and mask query parameters
    for (const [key, value] of queryParams.entries()) {
      if (isLikelyKey(value)) {
        queryParams.set(key, maskString(value));
      }
    }

    parsedUrl.pathname = pathParts.join('/');
    return parsedUrl.toString();
  } catch (error) {
    return rpcUrl; // return original URL if parsing fails
  }
};

export const getChainIdFromRpcUrl = async (rpcUrl: string) => {
  if (!isURL(rpcUrl)) throw new Error('RPC URL has not a valid format');

  const provider = viem.createPublicClient({ transport: viem.http(rpcUrl, { timeout: 180000 }) });
  return provider.getChainId();
};

export async function resolveProvider({
  cliSettings,
  chainId,
  quiet = false,
  action,
}: ProviderParams): Promise<{ provider: viem.PublicClient & viem.WalletClient; signers: CannonSigner[] }> {
  const chainData = getChainById(chainId!);

  if (!quiet) {
    log(bold(`Resolving connection to ${chainData.name} (Chain ID: ${chainId})...`));
  }

  // Check if the first provider URL is actually an URL.
  const isRpcUrl = isURL(cliSettings.rpcUrl.split(',')[0]);

  if (!isRpcUrl) {
    // If privateKey is present or no valid http URLs are available in rpcUrls
    if (cliSettings.privateKey) {
      if (chainData.rpcUrls.default.http.length === 0) {
        error(
          red(
            `Failed to establish a connection with any RPC. Please specify a valid RPC url using the ${bold(
              '--rpc-url'
            )} flag.`
          )
        );
        process.exit(1);
      }
      // Use default http URLs from chainData
      cliSettings.rpcUrl = chainData.rpcUrls.default.http.join(',');
    } else {
      // Merge with viem's default rpc URLs, remove duplicates
      const rpcs = [...new Set([...cliSettings.rpcUrl.split(','), ...chainData.rpcUrls.default.http])];
      cliSettings.rpcUrl = rpcs.join(',');
    }
  }

  return resolveProviderAndSigners({
    chainId: chainId!,
    checkProviders: cliSettings.rpcUrl.split(','),
    privateKey: cliSettings.privateKey,
    action,
  });
}

export async function resolveRegistryProviders({
  cliSettings,
  action,
}: ProviderParams): Promise<{ provider: viem.PublicClient & viem.WalletClient; signers: CannonSigner[] }[]> {
  const resolvedProviders = [];

  for (const registryInfo of cliSettings.registries) {
    resolvedProviders.push(
      await resolveProviderAndSigners({
        chainId: registryInfo.chainId!,
        checkProviders: registryInfo.rpcUrl,
        privateKey: cliSettings.privateKey!,
        action,
      })
    );
  }

  return resolvedProviders;
}

export async function resolveProviderAndSigners({
  chainId,
  checkProviders = ['frame'],
  privateKey,
  action,
}: {
  chainId: number;
  checkProviders?: string[];
  privateKey?: string;
  action: ProviderAction;
}): Promise<{ provider: viem.PublicClient & viem.WalletClient; signers: CannonSigner[] }> {
  const providerDisplayName = (rpcUrl: string) => {
    switch (rpcUrl) {
      case 'frame':
        return 'Frame (frame.sh) if running';
      case 'direct':
        return 'default IPC paths, ws://127.0.0.1:8546, or http://127.0.0.1:8545';
      default:
        return hideApiKey(rpcUrl);
    }
  };

  if (
    ProviderAction.WriteProvider === action ||
    ProviderAction.WriteDryRunProvider === action ||
    ProviderAction.OptionalWriteProvider === action
  ) {
    log(grey(`Attempting to find connection via ${bold(providerDisplayName(checkProviders[0]))}`));
    if (checkProviders.length === 1) log('');
  }

  debug(
    'resolving provider',
    checkProviders.map((p) => hideApiKey(p)),
    chainId
  );

  const rawProvider = provider(checkProviders, { origin: 'Cannon' });

  // ensure provider is enabled and on the chain we expect
  try {
    rawProvider.setChain(Number.parseInt(chainId.toString())); // its important here we ensure chainId is a number
  } catch (err) {
    error(`Failed to use chain id ${chainId}`, err);
    throw err;
  }

  let publicClient: viem.PublicClient & viem.WalletClient;

  // TODO: if at any point we let users provide multiple urls, this will have to be changed.
  // force provider to use JSON-RPC instead of Web3Provider for local http urls
  const signers: CannonSigner[] = [];

  if (isURL(checkProviders[0])) {
    debug(
      'use explicit provider url',
      checkProviders.map((p) => hideApiKey(p))
    );
    try {
      publicClient = (
        viem.createPublicClient({
          chain: getChainById(chainId),
          transport: viem.http(checkProviders[0], { timeout: 180000 }),
        }) as any
      ).extend(traceActions({}));
    } catch (err) {
      if (checkProviders.length <= 1) {
        error(
          red(
            `Failed to establish a connection with any RPC. Please specify a valid RPC url using the ${bold(
              '--rpc-url'
            )} flag.`
          )
        );
        process.exit(1);
      }

      return await resolveProviderAndSigners({
        chainId,
        checkProviders: checkProviders.slice(1),
        privateKey,
        action,
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

      switch (action) {
        case ProviderAction.WriteProvider:
        case ProviderAction.OptionalWriteProvider: {
          const isOptional = ProviderAction.OptionalWriteProvider === action;

          const keyPrompt = await prompts({
            type: 'text',
            name: 'value',
            message: `Enter the private key of the address you want to use ${isOptional ? '(Optional)' : ''}:`,
            style: 'password',
            validate: (key) => {
              if (isOptional && !key) return true;
              return isPrivateKey(normalizePrivateKey(key)) || 'Private key is not valid';
            },
          });

          if (keyPrompt.value) {
            const account = privateKeyToAccount(normalizePrivateKey(keyPrompt.value as viem.Hex));

            signers.push({
              address: account.address,
              wallet: viem.createWalletClient({
                account,
                chain: getChainById(chainId),
                transport: viem.custom(publicClient.transport),
              }),
            });
          }

          break;
        }

        case ProviderAction.ReadProvider:
        case ProviderAction.WriteDryRunProvider: {
          // No signer needed for this action
          break;
        }

        default:
          break;
      }
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
        error(
          red(
            `Failed to establish a connection with any RPC. Please specify a valid RPC url using the ${bold(
              '--rpc-url'
            )} flag.`
          )
        );
        process.exit(1);
      }

      return await resolveProviderAndSigners({
        chainId,
        checkProviders: checkProviders.slice(1),
        privateKey,
        action,
      });
    }
  }

  debug(`returning ${signers.length && signers[0].address} signers`);

  return {
    provider: publicClient,
    signers,
  };
}
