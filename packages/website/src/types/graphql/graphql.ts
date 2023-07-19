/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigDecimal: { input: any; output: any; }
  BigInt: { input: any; output: any; }
  Bytes: { input: any; output: any; }
  /**
   * 8 bytes signed integer
   *
   */
  Int8: { input: any; output: any; }
};

export type BlockChangedFilter = {
  number_gte: Scalars['Int']['input'];
};

export type Block_Height = {
  hash?: InputMaybe<Scalars['Bytes']['input']>;
  number?: InputMaybe<Scalars['Int']['input']>;
  number_gte?: InputMaybe<Scalars['Int']['input']>;
};

/** Defines the order direction, either ascending or descending */
export enum OrderDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export type Package = {
  __typename?: 'Package';
  id: Scalars['ID']['output'];
  last_publisher: Scalars['String']['output'];
  last_updated: Scalars['BigInt']['output'];
  name: Scalars['String']['output'];
  tags: Array<Tag>;
};


export type PackageTagsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Tag_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Tag_Filter>;
};

export type Package_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Package_Filter>>>;
  id?: InputMaybe<Scalars['ID']['input']>;
  id_gt?: InputMaybe<Scalars['ID']['input']>;
  id_gte?: InputMaybe<Scalars['ID']['input']>;
  id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  id_lt?: InputMaybe<Scalars['ID']['input']>;
  id_lte?: InputMaybe<Scalars['ID']['input']>;
  id_not?: InputMaybe<Scalars['ID']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  last_publisher?: InputMaybe<Scalars['String']['input']>;
  last_publisher_contains?: InputMaybe<Scalars['String']['input']>;
  last_publisher_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_ends_with?: InputMaybe<Scalars['String']['input']>;
  last_publisher_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_gt?: InputMaybe<Scalars['String']['input']>;
  last_publisher_gte?: InputMaybe<Scalars['String']['input']>;
  last_publisher_in?: InputMaybe<Array<Scalars['String']['input']>>;
  last_publisher_lt?: InputMaybe<Scalars['String']['input']>;
  last_publisher_lte?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_contains?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  last_publisher_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_starts_with?: InputMaybe<Scalars['String']['input']>;
  last_publisher_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  last_updated?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_gt?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_gte?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  last_updated_lt?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_lte?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_not?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  name?: InputMaybe<Scalars['String']['input']>;
  name_contains?: InputMaybe<Scalars['String']['input']>;
  name_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  name_ends_with?: InputMaybe<Scalars['String']['input']>;
  name_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_gt?: InputMaybe<Scalars['String']['input']>;
  name_gte?: InputMaybe<Scalars['String']['input']>;
  name_in?: InputMaybe<Array<Scalars['String']['input']>>;
  name_lt?: InputMaybe<Scalars['String']['input']>;
  name_lte?: InputMaybe<Scalars['String']['input']>;
  name_not?: InputMaybe<Scalars['String']['input']>;
  name_not_contains?: InputMaybe<Scalars['String']['input']>;
  name_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  name_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  name_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  name_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  name_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_starts_with?: InputMaybe<Scalars['String']['input']>;
  name_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  or?: InputMaybe<Array<InputMaybe<Package_Filter>>>;
  tags_?: InputMaybe<Tag_Filter>;
};

export enum Package_OrderBy {
  Id = 'id',
  LastPublisher = 'last_publisher',
  LastUpdated = 'last_updated',
  Name = 'name',
  Tags = 'tags'
}

export type Query = {
  __typename?: 'Query';
  /** Access to subgraph metadata */
  _meta?: Maybe<_Meta_>;
  package?: Maybe<Package>;
  packages: Array<Package>;
  tag?: Maybe<Tag>;
  tags: Array<Tag>;
  variant?: Maybe<Variant>;
  variants: Array<Variant>;
};


export type Query_MetaArgs = {
  block?: InputMaybe<Block_Height>;
};


export type QueryPackageArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryPackagesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Package_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Package_Filter>;
};


export type QueryTagArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryTagsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Tag_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Tag_Filter>;
};


export type QueryVariantArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryVariantsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Variant_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Variant_Filter>;
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Access to subgraph metadata */
  _meta?: Maybe<_Meta_>;
  package?: Maybe<Package>;
  packages: Array<Package>;
  tag?: Maybe<Tag>;
  tags: Array<Tag>;
  variant?: Maybe<Variant>;
  variants: Array<Variant>;
};


export type Subscription_MetaArgs = {
  block?: InputMaybe<Block_Height>;
};


export type SubscriptionPackageArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionPackagesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Package_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Package_Filter>;
};


export type SubscriptionTagArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionTagsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Tag_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Tag_Filter>;
};


export type SubscriptionVariantArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionVariantsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Variant_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Variant_Filter>;
};

export type Tag = {
  __typename?: 'Tag';
  cannon_package: Package;
  id: Scalars['ID']['output'];
  last_publisher: Scalars['String']['output'];
  last_updated: Scalars['BigInt']['output'];
  name: Scalars['String']['output'];
  variants: Array<Variant>;
};


export type TagVariantsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Variant_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Variant_Filter>;
};

export type Tag_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Tag_Filter>>>;
  cannon_package?: InputMaybe<Scalars['String']['input']>;
  cannon_package_?: InputMaybe<Package_Filter>;
  cannon_package_contains?: InputMaybe<Scalars['String']['input']>;
  cannon_package_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  cannon_package_ends_with?: InputMaybe<Scalars['String']['input']>;
  cannon_package_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  cannon_package_gt?: InputMaybe<Scalars['String']['input']>;
  cannon_package_gte?: InputMaybe<Scalars['String']['input']>;
  cannon_package_in?: InputMaybe<Array<Scalars['String']['input']>>;
  cannon_package_lt?: InputMaybe<Scalars['String']['input']>;
  cannon_package_lte?: InputMaybe<Scalars['String']['input']>;
  cannon_package_not?: InputMaybe<Scalars['String']['input']>;
  cannon_package_not_contains?: InputMaybe<Scalars['String']['input']>;
  cannon_package_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  cannon_package_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  cannon_package_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  cannon_package_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  cannon_package_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  cannon_package_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  cannon_package_starts_with?: InputMaybe<Scalars['String']['input']>;
  cannon_package_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  id_gt?: InputMaybe<Scalars['ID']['input']>;
  id_gte?: InputMaybe<Scalars['ID']['input']>;
  id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  id_lt?: InputMaybe<Scalars['ID']['input']>;
  id_lte?: InputMaybe<Scalars['ID']['input']>;
  id_not?: InputMaybe<Scalars['ID']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  last_publisher?: InputMaybe<Scalars['String']['input']>;
  last_publisher_contains?: InputMaybe<Scalars['String']['input']>;
  last_publisher_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_ends_with?: InputMaybe<Scalars['String']['input']>;
  last_publisher_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_gt?: InputMaybe<Scalars['String']['input']>;
  last_publisher_gte?: InputMaybe<Scalars['String']['input']>;
  last_publisher_in?: InputMaybe<Array<Scalars['String']['input']>>;
  last_publisher_lt?: InputMaybe<Scalars['String']['input']>;
  last_publisher_lte?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_contains?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  last_publisher_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_starts_with?: InputMaybe<Scalars['String']['input']>;
  last_publisher_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  last_updated?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_gt?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_gte?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  last_updated_lt?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_lte?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_not?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  name?: InputMaybe<Scalars['String']['input']>;
  name_contains?: InputMaybe<Scalars['String']['input']>;
  name_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  name_ends_with?: InputMaybe<Scalars['String']['input']>;
  name_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_gt?: InputMaybe<Scalars['String']['input']>;
  name_gte?: InputMaybe<Scalars['String']['input']>;
  name_in?: InputMaybe<Array<Scalars['String']['input']>>;
  name_lt?: InputMaybe<Scalars['String']['input']>;
  name_lte?: InputMaybe<Scalars['String']['input']>;
  name_not?: InputMaybe<Scalars['String']['input']>;
  name_not_contains?: InputMaybe<Scalars['String']['input']>;
  name_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  name_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  name_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  name_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  name_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_starts_with?: InputMaybe<Scalars['String']['input']>;
  name_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  or?: InputMaybe<Array<InputMaybe<Tag_Filter>>>;
  variants_?: InputMaybe<Variant_Filter>;
};

export enum Tag_OrderBy {
  CannonPackage = 'cannon_package',
  CannonPackageId = 'cannon_package__id',
  CannonPackageLastPublisher = 'cannon_package__last_publisher',
  CannonPackageLastUpdated = 'cannon_package__last_updated',
  CannonPackageName = 'cannon_package__name',
  Id = 'id',
  LastPublisher = 'last_publisher',
  LastUpdated = 'last_updated',
  Name = 'name',
  Variants = 'variants'
}

export type Variant = {
  __typename?: 'Variant';
  chain_id: Scalars['Int']['output'];
  deploy_url: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  last_publisher: Scalars['String']['output'];
  last_updated: Scalars['BigInt']['output'];
  meta_url: Scalars['String']['output'];
  name: Scalars['String']['output'];
  preset: Scalars['String']['output'];
  tag: Tag;
};

export type Variant_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Variant_Filter>>>;
  chain_id?: InputMaybe<Scalars['Int']['input']>;
  chain_id_gt?: InputMaybe<Scalars['Int']['input']>;
  chain_id_gte?: InputMaybe<Scalars['Int']['input']>;
  chain_id_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  chain_id_lt?: InputMaybe<Scalars['Int']['input']>;
  chain_id_lte?: InputMaybe<Scalars['Int']['input']>;
  chain_id_not?: InputMaybe<Scalars['Int']['input']>;
  chain_id_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  deploy_url?: InputMaybe<Scalars['String']['input']>;
  deploy_url_contains?: InputMaybe<Scalars['String']['input']>;
  deploy_url_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  deploy_url_ends_with?: InputMaybe<Scalars['String']['input']>;
  deploy_url_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  deploy_url_gt?: InputMaybe<Scalars['String']['input']>;
  deploy_url_gte?: InputMaybe<Scalars['String']['input']>;
  deploy_url_in?: InputMaybe<Array<Scalars['String']['input']>>;
  deploy_url_lt?: InputMaybe<Scalars['String']['input']>;
  deploy_url_lte?: InputMaybe<Scalars['String']['input']>;
  deploy_url_not?: InputMaybe<Scalars['String']['input']>;
  deploy_url_not_contains?: InputMaybe<Scalars['String']['input']>;
  deploy_url_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  deploy_url_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  deploy_url_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  deploy_url_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  deploy_url_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  deploy_url_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  deploy_url_starts_with?: InputMaybe<Scalars['String']['input']>;
  deploy_url_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  id_gt?: InputMaybe<Scalars['ID']['input']>;
  id_gte?: InputMaybe<Scalars['ID']['input']>;
  id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  id_lt?: InputMaybe<Scalars['ID']['input']>;
  id_lte?: InputMaybe<Scalars['ID']['input']>;
  id_not?: InputMaybe<Scalars['ID']['input']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  last_publisher?: InputMaybe<Scalars['String']['input']>;
  last_publisher_contains?: InputMaybe<Scalars['String']['input']>;
  last_publisher_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_ends_with?: InputMaybe<Scalars['String']['input']>;
  last_publisher_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_gt?: InputMaybe<Scalars['String']['input']>;
  last_publisher_gte?: InputMaybe<Scalars['String']['input']>;
  last_publisher_in?: InputMaybe<Array<Scalars['String']['input']>>;
  last_publisher_lt?: InputMaybe<Scalars['String']['input']>;
  last_publisher_lte?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_contains?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  last_publisher_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  last_publisher_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  last_publisher_starts_with?: InputMaybe<Scalars['String']['input']>;
  last_publisher_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  last_updated?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_gt?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_gte?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  last_updated_lt?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_lte?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_not?: InputMaybe<Scalars['BigInt']['input']>;
  last_updated_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  meta_url?: InputMaybe<Scalars['String']['input']>;
  meta_url_contains?: InputMaybe<Scalars['String']['input']>;
  meta_url_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  meta_url_ends_with?: InputMaybe<Scalars['String']['input']>;
  meta_url_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  meta_url_gt?: InputMaybe<Scalars['String']['input']>;
  meta_url_gte?: InputMaybe<Scalars['String']['input']>;
  meta_url_in?: InputMaybe<Array<Scalars['String']['input']>>;
  meta_url_lt?: InputMaybe<Scalars['String']['input']>;
  meta_url_lte?: InputMaybe<Scalars['String']['input']>;
  meta_url_not?: InputMaybe<Scalars['String']['input']>;
  meta_url_not_contains?: InputMaybe<Scalars['String']['input']>;
  meta_url_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  meta_url_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  meta_url_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  meta_url_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  meta_url_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  meta_url_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  meta_url_starts_with?: InputMaybe<Scalars['String']['input']>;
  meta_url_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  name_contains?: InputMaybe<Scalars['String']['input']>;
  name_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  name_ends_with?: InputMaybe<Scalars['String']['input']>;
  name_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_gt?: InputMaybe<Scalars['String']['input']>;
  name_gte?: InputMaybe<Scalars['String']['input']>;
  name_in?: InputMaybe<Array<Scalars['String']['input']>>;
  name_lt?: InputMaybe<Scalars['String']['input']>;
  name_lte?: InputMaybe<Scalars['String']['input']>;
  name_not?: InputMaybe<Scalars['String']['input']>;
  name_not_contains?: InputMaybe<Scalars['String']['input']>;
  name_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  name_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  name_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  name_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  name_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  name_starts_with?: InputMaybe<Scalars['String']['input']>;
  name_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  or?: InputMaybe<Array<InputMaybe<Variant_Filter>>>;
  preset?: InputMaybe<Scalars['String']['input']>;
  preset_contains?: InputMaybe<Scalars['String']['input']>;
  preset_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  preset_ends_with?: InputMaybe<Scalars['String']['input']>;
  preset_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  preset_gt?: InputMaybe<Scalars['String']['input']>;
  preset_gte?: InputMaybe<Scalars['String']['input']>;
  preset_in?: InputMaybe<Array<Scalars['String']['input']>>;
  preset_lt?: InputMaybe<Scalars['String']['input']>;
  preset_lte?: InputMaybe<Scalars['String']['input']>;
  preset_not?: InputMaybe<Scalars['String']['input']>;
  preset_not_contains?: InputMaybe<Scalars['String']['input']>;
  preset_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  preset_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  preset_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  preset_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  preset_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  preset_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  preset_starts_with?: InputMaybe<Scalars['String']['input']>;
  preset_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
  tag_?: InputMaybe<Tag_Filter>;
  tag_contains?: InputMaybe<Scalars['String']['input']>;
  tag_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  tag_ends_with?: InputMaybe<Scalars['String']['input']>;
  tag_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  tag_gt?: InputMaybe<Scalars['String']['input']>;
  tag_gte?: InputMaybe<Scalars['String']['input']>;
  tag_in?: InputMaybe<Array<Scalars['String']['input']>>;
  tag_lt?: InputMaybe<Scalars['String']['input']>;
  tag_lte?: InputMaybe<Scalars['String']['input']>;
  tag_not?: InputMaybe<Scalars['String']['input']>;
  tag_not_contains?: InputMaybe<Scalars['String']['input']>;
  tag_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  tag_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  tag_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  tag_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  tag_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  tag_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  tag_starts_with?: InputMaybe<Scalars['String']['input']>;
  tag_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
};

export enum Variant_OrderBy {
  ChainId = 'chain_id',
  DeployUrl = 'deploy_url',
  Id = 'id',
  LastPublisher = 'last_publisher',
  LastUpdated = 'last_updated',
  MetaUrl = 'meta_url',
  Name = 'name',
  Preset = 'preset',
  Tag = 'tag',
  TagId = 'tag__id',
  TagLastPublisher = 'tag__last_publisher',
  TagLastUpdated = 'tag__last_updated',
  TagName = 'tag__name'
}

export type _Block_ = {
  __typename?: '_Block_';
  /** The hash of the block */
  hash?: Maybe<Scalars['Bytes']['output']>;
  /** The block number */
  number: Scalars['Int']['output'];
  /** Integer representation of the timestamp stored in blocks for the chain */
  timestamp?: Maybe<Scalars['Int']['output']>;
};

/** The type for the top-level _meta field */
export type _Meta_ = {
  __typename?: '_Meta_';
  /**
   * Information about a specific subgraph block. The hash of the block
   * will be null if the _meta field has a block constraint that asks for
   * a block number. It will be filled if the _meta field has no block constraint
   * and therefore asks for the latest  block
   *
   */
  block: _Block_;
  /** The deployment ID */
  deployment: Scalars['String']['output'];
  /** If `true`, the subgraph encountered indexing errors at some past block */
  hasIndexingErrors: Scalars['Boolean']['output'];
};

export enum _SubgraphErrorPolicy_ {
  /** Data will be returned even if the subgraph has indexing errors */
  Allow = 'allow',
  /** If the subgraph has indexing errors, data will be omitted. The default. */
  Deny = 'deny'
}

export type GetPackagesQueryVariables = Exact<{
  query: Scalars['String']['input'];
  skip: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
}>;


export type GetPackagesQuery = { __typename?: 'Query', packages: Array<{ __typename?: 'Package', name: string, last_updated: any, last_publisher: string, tags: Array<{ __typename?: 'Tag', name: string, last_updated: any, last_publisher: string, variants: Array<{ __typename?: 'Variant', name: string, last_updated: any, last_publisher: string, preset: string, chain_id: number, deploy_url: string, meta_url: string }> }> }> };

export type GetTotalPackagesQueryVariables = Exact<{
  query: Scalars['String']['input'];
}>;


export type GetTotalPackagesQuery = { __typename?: 'Query', totalPackages: Array<{ __typename?: 'Package', id: string }> };


export const GetPackagesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getPackages"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"skip"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"packages"},"name":{"kind":"Name","value":"packages"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"skip"},"value":{"kind":"Variable","name":{"kind":"Name","value":"skip"}}},{"kind":"Argument","name":{"kind":"Name","value":"orderDirection"},"value":{"kind":"EnumValue","value":"desc"}},{"kind":"Argument","name":{"kind":"Name","value":"orderBy"},"value":{"kind":"EnumValue","value":"last_updated"}},{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name_contains"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"last_updated"}},{"kind":"Field","name":{"kind":"Name","value":"last_publisher"}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderDirection"},"value":{"kind":"EnumValue","value":"desc"}},{"kind":"Argument","name":{"kind":"Name","value":"orderBy"},"value":{"kind":"EnumValue","value":"last_updated"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"last_updated"}},{"kind":"Field","name":{"kind":"Name","value":"last_publisher"}},{"kind":"Field","name":{"kind":"Name","value":"variants"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderDirection"},"value":{"kind":"EnumValue","value":"desc"}},{"kind":"Argument","name":{"kind":"Name","value":"orderBy"},"value":{"kind":"EnumValue","value":"last_updated"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"last_updated"}},{"kind":"Field","name":{"kind":"Name","value":"last_publisher"}},{"kind":"Field","name":{"kind":"Name","value":"preset"}},{"kind":"Field","name":{"kind":"Name","value":"chain_id"}},{"kind":"Field","name":{"kind":"Name","value":"deploy_url"}},{"kind":"Field","name":{"kind":"Name","value":"meta_url"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetPackagesQuery, GetPackagesQueryVariables>;
export const GetTotalPackagesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getTotalPackages"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"totalPackages"},"name":{"kind":"Name","value":"packages"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name_contains"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<GetTotalPackagesQuery, GetTotalPackagesQueryVariables>;