import * as viem from 'viem';
import * as viemChains from 'viem/chains';

export const chains: viem.Chain[] = Object.values(viemChains).filter(
  (v) => typeof v === 'object' && v !== null && 'id' in v && 'name' in v
) as viem.Chain[];

export function getChainById(id: number): viem.Chain {
  const chain = viem.extractChain({
    chains,
    id,
  });

  if (chain) return chain;

  return {
    id,
    name: 'Unknown Network',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: { default: { http: [] } },
  };
}
