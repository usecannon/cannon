import type { Address } from 'viem';

export type IpfsUrl = `ipfs://${string}`;

export interface RedisPackage {
  type: 'package';
  name: string;
  preset: string;
  chainId: string;
  version: string;
  owner: string;
  deployUrl: string;
  metaUrl: string;
  miscUrl?: string;
  timestamp: string;
}

export interface RedisTag {
  type: 'tag';
  name: string;
  tag: string;
  preset: string;
  chainId: string;
  versionOfTag: string;
  timestamp: string;
}

export interface RedisFunction {
  type: 'function';
  name: string;
  selector: string;
  timestamp: string;
  package: string;
  chainId: string;
  address: Address;
  contractName: string;
}

export type RedisDocument = RedisPackage | RedisTag;

export interface ApiNamespace {
  type: 'namespace';
  name: string;
  count: number;
}

export interface ApiPackage {
  type: 'package';
  name: string;
  publisher: string;
  version: string;
  preset: string;
  chainId: number;
  deployUrl: IpfsUrl;
  metaUrl: IpfsUrl;
  miscUrl: IpfsUrl;
  timestamp: number;
}

export interface ApiContract {
  type: 'contract';
  name: string;
  address: Address;
  chainId: number;
  packageName: string;
  preset: string;
  version: string;
}

export interface ApiSelectorResult {
  type: 'function' | 'event' | 'error';
  name: string;
  selector: string;
  contractName?: string;
  chainId?: number;
  address?: Address;
  packageName?: string;
  preset?: string;
  version?: string;
}

export type ApiDocument = ApiNamespace | ApiPackage | ApiContract | ApiSelectorResult;

type ExtractType<T> = T extends { type: infer U } ? U : never;
export type ApiDocumentType = ExtractType<ApiDocument>;
