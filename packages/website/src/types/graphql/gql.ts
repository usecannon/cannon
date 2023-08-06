/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 */
const documents = {
    "\n  query getPackages($query: String!, $skip: Int!, $first: Int!) {\n    packages: packages(\n      first: $first\n      skip: $skip\n      orderDirection: desc\n      orderBy: last_updated\n      where: { name_contains: $query }\n    ) {\n      id\n      name\n      last_updated\n      last_publisher\n      tags(orderDirection: desc, orderBy: last_updated) {\n        id\n        name\n        last_updated\n        last_publisher\n        variants(orderDirection: desc, orderBy: last_updated) {\n          name\n          last_updated\n          last_publisher\n          preset\n          chain_id\n          deploy_url\n          meta_url\n        }\n      }\n    }\n  }\n": types.GetPackagesDocument,
    "\n  query getTotalPackages($query: String!) {\n    totalPackages: packages(where: { name_contains: $query }) {\n      id\n    }\n  }\n": types.GetTotalPackagesDocument,
    "\n  query getPackage($name: String!) {\n    packages(first: 1, orderDirection: desc, orderBy: last_updated, where: { name: $name }) {\n      id\n      name\n      last_updated\n      last_publisher\n      tags(orderDirection: desc, orderBy: last_updated) {\n        id\n        name\n        last_updated\n        last_publisher\n        variants(orderDirection: desc, orderBy: last_updated) {\n          name\n          last_updated\n          last_publisher\n          preset\n          chain_id\n          deploy_url\n          meta_url\n        }\n      }\n    }\n  }\n": types.GetPackageDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query getPackages($query: String!, $skip: Int!, $first: Int!) {\n    packages: packages(\n      first: $first\n      skip: $skip\n      orderDirection: desc\n      orderBy: last_updated\n      where: { name_contains: $query }\n    ) {\n      id\n      name\n      last_updated\n      last_publisher\n      tags(orderDirection: desc, orderBy: last_updated) {\n        id\n        name\n        last_updated\n        last_publisher\n        variants(orderDirection: desc, orderBy: last_updated) {\n          name\n          last_updated\n          last_publisher\n          preset\n          chain_id\n          deploy_url\n          meta_url\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query getPackages($query: String!, $skip: Int!, $first: Int!) {\n    packages: packages(\n      first: $first\n      skip: $skip\n      orderDirection: desc\n      orderBy: last_updated\n      where: { name_contains: $query }\n    ) {\n      id\n      name\n      last_updated\n      last_publisher\n      tags(orderDirection: desc, orderBy: last_updated) {\n        id\n        name\n        last_updated\n        last_publisher\n        variants(orderDirection: desc, orderBy: last_updated) {\n          name\n          last_updated\n          last_publisher\n          preset\n          chain_id\n          deploy_url\n          meta_url\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query getTotalPackages($query: String!) {\n    totalPackages: packages(where: { name_contains: $query }) {\n      id\n    }\n  }\n"): (typeof documents)["\n  query getTotalPackages($query: String!) {\n    totalPackages: packages(where: { name_contains: $query }) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query getPackage($name: String!) {\n    packages(first: 1, orderDirection: desc, orderBy: last_updated, where: { name: $name }) {\n      id\n      name\n      last_updated\n      last_publisher\n      tags(orderDirection: desc, orderBy: last_updated) {\n        id\n        name\n        last_updated\n        last_publisher\n        variants(orderDirection: desc, orderBy: last_updated) {\n          name\n          last_updated\n          last_publisher\n          preset\n          chain_id\n          deploy_url\n          meta_url\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query getPackage($name: String!) {\n    packages(first: 1, orderDirection: desc, orderBy: last_updated, where: { name: $name }) {\n      id\n      name\n      last_updated\n      last_publisher\n      tags(orderDirection: desc, orderBy: last_updated) {\n        id\n        name\n        last_updated\n        last_publisher\n        variants(orderDirection: desc, orderBy: last_updated) {\n          name\n          last_updated\n          last_publisher\n          preset\n          chain_id\n          deploy_url\n          meta_url\n        }\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;