export type IpfsUrl = `ipfs://${string}`;

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

type ExtractType<T> = T extends { type: infer U } ? U : never;

export type ApiDocument = ApiNamespace | ApiPackage;
export type ApiDocumentType = ExtractType<ApiDocument>;
