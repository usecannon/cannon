import { extractChain, Chain } from 'viem';
import * as viemChains from 'viem/chains';

export const cannonChain: Chain = {
  id: 13370,
  name: 'Cannon Local',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: { default: { http: ['http://localhost:8545'] } },
};

export const chains: Chain[] = [cannonChain, ...Object.values(viemChains)];

export function getChainById(id: any) {
  return extractChain({
    chains,
    id,
  });
}
