import { z } from 'zod';
import { handleZodErrors } from './error/zod';
import { ChainBuilderRuntime } from './runtime';
import { chainDefinitionSchema } from './schemas';
import cloneSpec from './steps/clone';
import deploySpec from './steps/deploy';
import invokeSpec from './steps/invoke';
import keeperSpec from './steps/keeper';
import pullSpec from './steps/pull';
import routerSpec from './steps/router';
import varSpec from './steps/var';
import { ChainArtifacts, ChainBuilderContext, ChainBuilderContextWithHelpers, PackageState } from './types';
import { AccessComputationResult } from './access-recorder';

export interface CannonAction {
  label: string;

  configInject: (ctx: ChainBuilderContextWithHelpers, config: any, packageState: PackageState) => any;

  getState: (
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContextWithHelpers,
    config: any,
    packageState: PackageState
  ) => Promise<any[] | null>;

  /**
   * Returns a list of state keys that this step consumes (used for dependency inference)
   */
  getInputs?: (config: any, packageState: PackageState) => AccessComputationResult;

  /**
   * Returns a list of state keys this step produces (used for dependency inference)
   */
  getOutputs?: (config: any, packageState: PackageState) => string[];

  exec: (
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    config: any,
    packageState: PackageState
  ) => Promise<ChainArtifacts>;

  importExisting?: (
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    config: any,
    packageState: PackageState,
    existingKeys: string[]
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
    throw new Error(`missing "label" property on plugin definition ${JSON.stringify(action)}`);
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

registerAction(deploySpec);
registerAction(pullSpec);
registerAction(invokeSpec);
registerAction(keeperSpec);
registerAction(cloneSpec);
registerAction(routerSpec);
registerAction(varSpec);

// backwards compatibility
registerAction(Object.assign({}, deploySpec, { label: 'contract' }));
registerAction(Object.assign({}, pullSpec, { label: 'import' }));
registerAction(Object.assign({}, cloneSpec, { label: 'provision' }));
registerAction(Object.assign({}, varSpec, { label: 'setting' }));
