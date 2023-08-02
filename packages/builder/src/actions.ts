import { z } from 'zod';

import { ChainBuilderRuntime } from './runtime';

import contractSpec from './steps/contract';

import importSpec from './steps/import';

import invokeSpec from './steps/invoke';
import keeperSpec from './steps/keeper';
import provisionSpec from './steps/provision';

import { ChainArtifacts, ChainBuilderContext, ChainBuilderContextWithHelpers, PackageState } from './types';
import { chainDefinitionSchema } from './schemas.zod';
import { handleZodErrors } from './error/zod';

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

  // Takes in any schema as long as the base type is ZodSchema
  validate: z.ZodSchema;

  timeout?: number;
}

/**
 * @internal
 * All the different types (and their implementations)
 */
export const ActionKinds: { [label: string]: CannonAction } = {};

/**
 *  Available properties for top level config
 *  @public
 *  @group Base Cannonfile Config
 
 */
export type RawChainDefinition = z.infer<typeof chainDefinitionSchema>;


/** 
 *  @internal
 *  parses the schema and performs zod validations safely with a custom error handler
*/ 
export function validateConfig(schema: z.ZodSchema, config: any) {
  const result = schema.safeParse(config);

  if (!result.success) {
    const errors = result.error.errors;
    handleZodErrors(errors);
  }

  return result;
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

  (chainDefinitionSchema.pick({
    description: true,
    keywords: true,
    setting: true,
    import: true
  }) as any)[label] = { values: action.validate };
}

registerAction(contractSpec);
registerAction(importSpec);
registerAction(invokeSpec);
registerAction(keeperSpec);
registerAction(provisionSpec);
