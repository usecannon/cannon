import Ajv, { JTDDataType, SomeJTDSchemaType } from 'ajv/dist/jtd';
import { ChainBuilderRuntime } from './runtime';

const ajv = new Ajv();

import contractSpec from './steps/contract';
import importSpec from './steps/import';
import invokeSpec from './steps/invoke';
import keeperSpec from './steps/keeper';
import provisionSpec from './steps/provision';
import { ChainArtifacts, ChainBuilderContext, ChainBuilderContextWithHelpers, PackageState } from './types';

export interface CannonAction {
  label: string;

  configInject: (ctx: ChainBuilderContextWithHelpers, config: any, packageState: PackageState) => any;

  getState: (
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContextWithHelpers,
    config: any,
    packageState: PackageState
  ) => any;

  exec: (
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    config: any,
    packageState: PackageState
  ) => Promise<ChainArtifacts>;

  validate: {
    properties: Record<string, SomeJTDSchemaType>;
    optionalProperties?: Record<string, SomeJTDSchemaType>;
    additionalProperties?: boolean;
  };
}

/**
 * All the different types (and their implementations)
 */
export const ActionKinds: { [label: string]: CannonAction } = {};

/**
 * NOTE: if you edit this schema, please also edit the constructor of `ChainDefinition` to account for non-action components of
 */
const ChainDefinitionSchema = {
  properties: {
    name: { type: 'string' },
    version: { type: 'string' },
  },
  optionalProperties: {
    description: { type: 'string' },
    keywords: { elements: { type: 'string' } },
    setting: {
      values: {
        optionalProperties: {
          description: { type: 'string' },
          type: { enum: ['number', 'string', 'boolean'] },
          defaultValue: { type: 'string' },
        },
      },
    },

    import: importSpec,
  },
} as const;

export type RawChainDefinition = JTDDataType<typeof ChainDefinitionSchema>;

export function registerAction(action: CannonAction) {
  if (typeof action.label !== 'string') {
    throw new Error('missing "label" property on plugin definition');
  }

  const { label } = action;

  if (ActionKinds[action.label]) {
    throw new Error('action kind already declared: ' + label);
  }

  ActionKinds[label] = action;
  (ChainDefinitionSchema.optionalProperties as any)[label] = { values: action.validate };
}

export function getChainDefinitionValidator() {
  return ajv.compile(ChainDefinitionSchema);
}

registerAction(contractSpec);
registerAction(importSpec);
registerAction(invokeSpec);
registerAction(keeperSpec);
registerAction(provisionSpec);
