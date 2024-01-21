import * as chains from '@wagmi/core/chains';
import { publicProvider } from 'wagmi/providers/public';
import { ethers } from 'ethers';

export function findChainUrl(chainId: number) {
  if (typeof chainId !== 'number') {
    throw new Error(`Invalid chainId: ${chainId}`);
  }

  const chain = Object.values(chains).find((c) => c.id === chainId);
  if (!chain) throw new Error(`Unknown chainId: ${chainId}`);

  const providerConfig = publicProvider()(chain);
  const url = providerConfig?.rpcUrls.http[0];

  if (!url) throw new Error(`Chaind ${chain.name} dos not have a default url`);

  return url;
}

export async function createFork({
  url,
  chainId,
  impersonate = [],
}: {
  url?: string;
  chainId: number;
  impersonate: string[];
}) {
  const chainUrl = url || findChainUrl(chainId);

  // This is a hack because we needed to remove ganache as a dependency because
  // it wasn't working the installation on CI
  // More info: https://stackoverflow.com/questions/49475492/npm-install-error-code-ebadplatform

  // @ts-ignore-next-line Import module
  await import('https://unpkg.com/ganache@7.9.1');
  const Ganache = (window as any).Ganache.default;

  const node = Ganache.provider({
    wallet: { unlockedAccounts: impersonate },
    chain: { chainId: chainId },
    fork: { url: chainUrl },
  });

  if (url) {
    const provider = url.startsWith('wss:')
      ? new ethers.providers.WebSocketProvider(url)
      : new ethers.providers.JsonRpcProvider(url);

    const urlChainId = await provider.getNetwork().then((n) => n.chainId);
    if (urlChainId !== chainId) {
      throw new Error(
        'Invalid Fork Provider Url configured in settings, it should have the same chainId as the Safe Wallet'
      );
    }

    if (provider instanceof ethers.providers.WebSocketProvider) {
      await provider.destroy();
    }
  }

  const bunchOfEth = ethers.utils.hexValue(ethers.utils.parseUnits('10000', 'ether').toHexString());

  await Promise.all(impersonate.map((addr) => node.send('evm_setAccountBalance', [addr, bunchOfEth])));

  return node;
}
