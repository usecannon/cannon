import { ethers } from 'ethers';

import { JsonFragment } from '@ethersproject/abi';

import _ from 'lodash';

import type { RawChainDefinition } from './definition';
import { CannonWrapperGenericProvider } from './error/provider';

export type OptionTypesTs = string | number | boolean;

// loosely based on the hardhat `Artifact` type
export type ContractArtifact = {
  contractName: string;
  sourceName: string;
  abi: JsonFragment[];
  bytecode: string;
  linkReferences: {
    [fileName: string]: {
      [contractName: string]: {
        start: number;
        length: number;
      }[];
    };
  };
};

export type ContractMap = {
  [label: string]: {
    address: string;
    abi: any[];
    constructorArgs?: any[]; // only needed for etherscan verification
    deployTxnHash: string;
    contractName: string;
    sourceName: string;
    deployedOn: string;
  };
};

export type TransactionMap = {
  [label: string]: {
    hash: string;
    events: EventMap;
    deployedOn: string;
  };
};

export type EventMap = {
  [name: string]: {
    args: string[];
  }[];
};

export interface ChainBuilderContext {
  settings: ChainBuilderOptions;
  chainId: number;
  timestamp: string;

  package: any;

  contracts: ContractMap;

  txns: TransactionMap;

  imports: BundledChainBuilderOutputs;
}

export type BuildOptions = { [val: string]: string };

export type StorageMode = 'all' | 'metadata' | 'none';

export interface ChainBuilderRuntime {
  // Interface to which all transactions should be sent and all state queried
  provider: CannonWrapperGenericProvider;

  // chainID to interact with
  chainId: number;

  // returns the signer associated with the given address. Reverts if the signer is not found or cannot be populated.
  getSigner: (addr: string) => Promise<ethers.Signer>;

  // returns a signer which should be used for sending the specified transaction.
  getDefaultSigner: (txn: ethers.providers.TransactionRequest, salt?: string) => Promise<ethers.Signer>;

  // returns contract information from the specified artifact name.
  getArtifact: (name: string) => Promise<ContractArtifact>;

  // Directory where relative file resolutions should originate from. Usually the location of package.json for currently built project
  baseDir: string | null;

  // Directory where cannon stores all of its packages. `packageDir` is derived from this
  packagesDir: string;

  // Directory where cannon package is located
  packageDir: string | null;

  readMode: StorageMode;
  writeMode: StorageMode;

  currentLabel: string | null;
}

export interface BundledChainBuilderOutputs {
  [module: string]: ChainArtifacts;
}

export type ChainArtifacts = Partial<Pick<ChainBuilderContext, 'imports' | 'contracts' | 'txns'>>;

export interface ChainBuilderOptions {
  [key: string]: OptionTypesTs;
}

export type DeploymentInfo = {
  // contents of cannonfile.toml used for this build in raw json form
  // if not included, defaults to the chain definition at the DeploymentManifest instead
  def?: RawChainDefinition;

  // setting overrides used to build this chain
  options: ChainBuilderOptions;

  // version of cannon that this was built with
  buildVersion: number;

  // basenames of the files which should be loaded to recreate the chain
  heads: string[];

  // location for the zip archive with the actual files for the chain/metadata
  ipfsHash: string;
};

export type DeploymentManifest = {
  // contents of cannonfile.toml stringified
  def: RawChainDefinition;

  // npm style package.json for the project being uploaded
  pkg: any;

  // archive which contains miscellaneus dependencies ex. documentation pages, contracts, etc.
  misc: {
    ipfsHash: string;
  };

  deploys: {
    [chainId: string]: {
      [preset: string]: DeploymentInfo;
    };
  };
};

export function combineCtx(ctxs: ChainBuilderContext[]): ChainBuilderContext {
  const ctx = _.clone(ctxs[0]);

  ctx.timestamp = Math.floor(Date.now() / 1000).toString(); //(await this.provider.getBlock(await this.provider.getBlockNumber())).timestamp.toString();

  // merge all blockchain outputs
  for (const additionalCtx of ctxs.slice(1)) {
    ctx.contracts = { ...ctx.contracts, ...additionalCtx.contracts };
    ctx.txns = { ...ctx.txns, ...additionalCtx.txns };
    ctx.imports = { ...ctx.imports, ...additionalCtx.imports };
  }

  return ctx;
}
