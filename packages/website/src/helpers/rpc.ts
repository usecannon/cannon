import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { useCallback } from 'react';
import { parseEther, toHex } from 'viem';

async function loadGanache() {
  // This is a hack because we needed to remove ganache as a dependency because
  // the installation wasn't working on CI.
  // More info: https://stackoverflow.com/questions/49475492/npm-install-error-code-ebadplatform

  // @ts-ignore-next-line Import module
  await import('https://unpkg.com/ganache@7.9.1');
  return new Promise((resolve) => {
    const checkGanache = setInterval(() => {
      if (window.Ganache) {
        clearInterval(checkGanache);
        resolve(window.Ganache.default);
      }
    }, 100);
  });
}

export function useCreateFork() {
  const { getChainById } = useCannonChains();

  return useCallback(
    async ({ chainId, impersonate = [], url }: { chainId: number; impersonate: string[]; url?: string }) => {
      const chain = getChainById(chainId);
      if (!chain) throw new Error(`Unknown chainId: ${chainId}`);
      const rpcUrl = url ?? chain.rpcUrls.default.http[0];

      await loadGanache();
      const Ganache = (window as any).Ganache.default;

      const node = Ganache.provider({
        wallet: { unlockedAccounts: impersonate },
        chain: { chainId },
        fork: {
          url: rpcUrl,
        },
      });

      await Promise.all(impersonate.map((addr) => node.send('evm_setAccountBalance', [addr, toHex(parseEther('10000'))])));

      return node;
    },
    [getChainById],
  );
}
