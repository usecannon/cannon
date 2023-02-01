import { ethers } from 'ethers';

import { JsonFragment } from '@ethersproject/abi';

import _ from 'lodash';

import type { RawChainDefinition } from './actions';
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

export type ContractData = {
  address: string;
  abi: JsonFragment[];
  constructorArgs?: any[]; // only needed for etherscan verification
  // only needed for etherscan verification,
  // only should be supplied when generated solidity as a single file
  sourceCode?: string;
  deployTxnHash: string;
  contractName: string;
  sourceName: string;
  deployedOn: string;
};

export type ContractMap = {
  [label: string]: ContractData;
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

  extras: { [label: string]: string };

  imports: BundledChainBuilderOutputs;
}

export type ChainBuilderContextWithHelpers = ChainBuilderContext & typeof ethers.utils & typeof ethers.constants;

export type BuildOptions = { [val: string]: OptionTypesTs };

export type StorageMode = 'all' | 'metadata' | 'none';

export interface ChainBuilderRuntimeInfo {
  // Interface to which all transactions should be sent and all state queried
  provider: CannonWrapperGenericProvider;

  // chainID to interact with
  chainId: number;

  // returns the signer associated with the given address. Reverts if the signer is not found or cannot be populated.
  getSigner: (addr: string) => Promise<ethers.Signer>;

  // returns a signer which should be used for sending the specified transaction.
  getDefaultSigner?: (txn: ethers.providers.TransactionRequest, salt?: string) => Promise<ethers.Signer>;

  // returns contract information from the specified artifact name.
  getArtifact?: (name: string) => Promise<ContractArtifact>;

  // Directory where relative file resolutions should originate from. Usually the location of package.json for currently built project
  baseDir: string | null;

  // Should record snapshots?
  snapshots: boolean;

  // Should gracefully continue after failures and return a partial release?
  allowPartialDeploy: boolean;
}

export interface BundledChainBuilderOutputs {
  [module: string]: { url: string } & ChainArtifacts;
}

export type ChainArtifacts = Partial<Pick<ChainBuilderContext, 'imports' | 'contracts' | 'txns' | 'extras'>>;

export interface ChainBuilderOptions {
  [key: string]: OptionTypesTs;
}

export type DeploymentInfo = {
  // contents of cannonfile.toml used for this build in raw json form
  // if not included, defaults to the chain definition at the DeploymentManifest instead
  def: RawChainDefinition;

  // setting overrides used to build this chain
  options: ChainBuilderOptions;

  // defines whether this deployment has been fully completed or only partially or completely unbuilt
  status?: 'complete' | 'partial' | 'none';

  // the result of all the build steps for the last build
  state: DeploymentState;

  // additional package information. could be `package.json` file from a hardhat project, for example.
  meta: any;

  // ipfs hash additional required files for possible build
  miscUrl: string;
};

export type DeploymentManifest = {
  // contents of cannonfile.toml stringified
  def: RawChainDefinition;

  // npm style package.json for the project being uploaded
  npmPackage: any;

  // tag of the package which was used as the base for this package
  upgradeFrom?: string;

  // archive which contains miscellaneus dependencies ex. documentation pages, contracts, etc.
  misc: {
    ipfsHash: string;
  };

  deploys: {
    [chainId: string]: {
      [preset: string]: {
        hash: string;
      };
    };
  };
};

export type StepState = {
  version: number;
  hash: string | null;
  artifacts: ChainArtifacts;
  chainDump?: string; // only included if cannon network build
};

export type DeploymentState = { [label: string]: StepState };

export function combineCtx(ctxs: ChainBuilderContext[]): ChainBuilderContext {
  const ctx = _.clone(ctxs[0]);

  ctx.timestamp = Math.floor(Date.now() / 1000).toString(); //(await this.provider.getBlock(await this.provider.getBlockNumber())).timestamp.toString();

  // merge all blockchain outputs
  for (const additionalCtx of ctxs.slice(1)) {
    ctx.contracts = { ...ctx.contracts, ...additionalCtx.contracts };
    ctx.txns = { ...ctx.txns, ...additionalCtx.txns };
    ctx.imports = { ...ctx.imports, ...additionalCtx.imports };
    ctx.extras = { ...ctx.extras, ...additionalCtx.extras };
  }

  return ctx;
}
