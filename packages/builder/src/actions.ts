import { ChainBuilderRuntime } from './runtime';

import contractSpec from './steps/contract';

import importSpec from './steps/import';

import invokeSpec from './steps/invoke';
import keeperSpec from './steps/keeper';
import provisionSpec from './steps/provision';

import { ChainArtifacts, ChainBuilderContext, ChainBuilderContextWithHelpers, PackageState } from './types';
import { chainDefinitionSchema, ChainDefinition, ConfigValidationSchema, validateConfig } from './schemas.zod';

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

  validate: ConfigValidationSchema;

  timeout?: number;
}

/**
 * All the different types (and their implementations)
 */
export const ActionKinds: { [label: string]: CannonAction } = {};

export type RawChainDefinition = ChainDefinition;

export function validateChainDefinitionSchema(def: RawChainDefinition) {
  return validateConfig('base', def);
}

export function registerAction(action: CannonAction) {
  if (typeof action.label !== 'string') {
    throw new Error('missing "label" property on plugin definition');
  }

  const { label } = action;

  if (ActionKinds[action.label]) {
    throw new Error('action kind already declared: ' + label);
  }

  ActionKinds[label] = action;

  (
    chainDefinitionSchema.pick({
      description: true,
      keywords: true,
      setting: true,
      import: true,
    }) as any
  )[label] = { values: action.validate };
}

registerAction(contractSpec);
registerAction(importSpec);
registerAction(invokeSpec);
registerAction(keeperSpec);
registerAction(provisionSpec);
