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
  address: Address;
  contractName: string;
  name: string;
  chainId: number;
  preset: string;
  version: string;
}

type ExtractType<T> = T extends { type: infer U } ? U : never;

export type ApiDocument = ApiNamespace | ApiPackage;
export type ApiDocumentType = ExtractType<ApiDocument>;
