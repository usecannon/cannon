import Ajv from 'ajv/dist/jtd';
import { JTDDataType } from 'ajv/dist/core';

import contractSpec from './contract';
import importSpec from './import';
import invokeSpec from './invoke';
import keeperSpec from './keeper';
import scriptSpec from './run';

const ajv = new Ajv();

export type OptionTypesTs = string | number | boolean;

export type ContractMap = {
  [label: string]: {
    address: string;
    abi: any[];
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
  fork: boolean;
  settings: ChainBuilderOptions;
  network: string;
  chainId: number;
  timestamp: string;

  repositoryBuild: boolean;

  package: any;

  contracts: ContractMap;

  txns: TransactionMap;

  imports: BundledChainBuilderOutputs;
}

export interface BundledChainBuilderOutputs {
  [module: string]: InternalOutputs;
}

export type InternalOutputs = Partial<Pick<ChainBuilderContext, 'imports' | 'contracts' | 'txns'>>;

export interface ChainBuilderOptions {
  [key: string]: OptionTypesTs;
}
