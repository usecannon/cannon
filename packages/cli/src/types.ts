export type PackageSettings = { [k: string]: string };

export interface PackageSpecification {
  name: string;
  version: string;
  settings: PackageSettings;
}

export interface IChainData {
  name: string;
  chainId: number;
  shortName: string;
  chain: string;
  network: string;
  networkId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  etherscanApi?: string;
  etherscanUrl?: string;
  rpc: string[];
  faucets: string[];
  infoURL: string;
}
