import { z } from 'zod';

export const PackageSettings = z.record(z.string());

export const PackageSpecification = z.object({
  name: z.string(),
  version: z.string(),
  settings: PackageSettings,
});

export const IChainData = z.object({
  name: z.string(),
  chainId: z.number(),
  shortName: z.string(),
  chain: z.string(),
  network: z.string(),
  networkId: z.number(),
  nativeCurrency: z.object({
    name: z.string(),
    symbol: z.string(),
    decimals: z.number(),
  }),
  etherscanApi: z.string().optional(),
  etherscanUrl: z.string().optional(),
  rpc: z.array(z.string()),
  faucets: z.array(z.string()),
  infoURL: z.string(),
});
