import { extractChain, parseEther, toHex } from 'viem';
import * as chains from 'viem/chains';

const chainsValues = Object.values(chains);

export function findChain(chainId: number) {
  if (typeof chainId !== 'number') {
    throw new Error(`Invalid chainId: ${chainId}`);
  }

  const chain = extractChain({
    chains: chainsValues,
    id: chainId as any,
  });

  if (!chain) throw new Error(`Unknown chainId: ${chainId}`);

  return chain;
}

export function findChainUrl(chainId: number) {
  const chain = findChain(chainId);
  const url = chain.rpcUrls.default.http[0];

  if (!url) throw new Error(`Chain "${chain.name}" does not have a default url`);

  return url;
}

export async function createFork({ chainId, impersonate = [] }: { chainId: number; impersonate: string[] }) {
  const chainUrl = findChainUrl(chainId);

  // This is a hack because we needed to remove ganache as a dependency because
  // the installation wasn't working on CI.
  // More info: https://stackoverflow.com/questions/49475492/npm-install-error-code-ebadplatform

  // @ts-ignore-next-line Import module
  await import('https://unpkg.com/ganache@7.9.1');
  const Ganache = (window as any).Ganache.default;

  const node = Ganache.provider({
    wallet: { unlockedAccounts: impersonate },
    chain: { chainId },
    fork: { url: chainUrl },
  });

  await Promise.all(impersonate.map((addr) => node.send('evm_setAccountBalance', [addr, toHex(parseEther('10000'))])));

  return node;
}
