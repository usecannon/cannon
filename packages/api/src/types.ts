export type IpfsUrl = `ipfs://${string}`;

export interface ApiPagination {
  total: number;
  page: number;
  per_page: number;
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
  timestamp: number;
}
