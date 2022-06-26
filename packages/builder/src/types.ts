import ethers from 'ethers';

import Ajv from 'ajv/dist/jtd';
import { JTDDataType } from 'ajv/dist/core';

import { JsonFragment } from '@ethersproject/abi';

import contractSpec from './contract';
import importSpec from './import';
import invokeSpec from './invoke';
import keeperSpec from './keeper';
import scriptSpec from './run';

const ajv = new Ajv();

export type OptionTypesTs = string | number | boolean;

export type ContractArtifact = {
  contractName: string;
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
  };
};

export type TransactionMap = {
  [label: string]: {
    hash: string;
    events: EventMap;
  };
};

export type EventMap = {
  [name: string]: {
    args: string[];
  }[];
};

const ChainDefinitionSchema = {
  properties: {
    name: { type: 'string' },
    version: { type: 'string' },
  },
  optionalProperties: {
    description: { type: 'string' },
    tags: { elements: { type: 'string' } },
    setting: {
      values: {
        optionalProperties: {
          description: { type: 'string' },
          type: { enum: ['number', 'string', 'boolean'] },
          defaultValue: {},
        },
      },
    },
    import: { values: importSpec.validate },
    contract: { values: contractSpec.validate },
    invoke: { values: invokeSpec.validate },
    run: { values: scriptSpec.validate },
    keeper: { values: keeperSpec.validate },
  },
} as const;

export type ChainDefinition = JTDDataType<typeof ChainDefinitionSchema>;

export type BuildOptions = { [val: string]: string };

export const validateChainDefinition = ajv.compile(ChainDefinitionSchema);

export interface ChainBuilderContext {
  settings: ChainBuilderOptions;
  chainId: number;
  timestamp: string;

  package: any;

  contracts: ContractMap;

  txns: TransactionMap;

  imports: BundledChainBuilderOutputs;
}

export type StorageMode = 'all' | 'metadata' | 'none';

export interface ChainBuilderRuntime {
  // Interface to which all transactions should be sent and all state queried
  provider: ethers.providers.BaseProvider;

  // returns the signer associated with the given address. Reverts if the signer is not found or cannot be populated.
  getSigner: (addr: string) => Promise<ethers.Signer>;

  // returns a signer which should be used for sending the specified transaction.
  getDefaultSigner: (txn: ethers.providers.TransactionRequest, salt?: string) => Promise<ethers.Signer>;

  // returns contract information from the specified artifact name.
  getArtifact: (name: string) => Promise<ContractArtifact>;

  // Directory where relative file resolutions should originate from. Usually the location of package.json for currently built project
  baseDir: string | null;

  // Directory where cannon chart is located
  chartDir: string | null;

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
