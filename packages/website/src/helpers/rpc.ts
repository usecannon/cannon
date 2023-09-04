import * as chains from '@wagmi/core/chains';
import { infuraProvider } from '@wagmi/core/dist/providers/infura';
import { ethers } from 'ethers';
import Ganache from 'ganache';

function findChainUrl(chainId: number) {
  if (typeof chainId !== 'number') {
    throw new Error(`Invalid chainId: ${chainId}`);
  }

  const chain = Object.values(chains).find((c) => c.id === chainId);
  if (!chain) throw new Error(`Unknown chainId: ${chainId}`);

  const providerConfig = infuraProvider({
    apiKey: process.env.NEXT_PUBLIC_INFURA_API_KEY || '',
  })(chain);
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
