export type IpfsUrl = `ipfs://${string}`;

export interface ApiPagination {
  total: number;
  page: number;
  per_page: number;
}

export interface ApiPackageTag {
  version: string;
  preset: string;
  chainId: number;
  deployUrl: IpfsUrl;
  metaUrl: IpfsUrl;
}

export interface ApiPackage {
  name: string;
  owner: string;
  publishers: `0x${string}`[];
  last_updated: number;
  tags: ApiPagination & {
    results: ApiPackageTag[];
  };
}
