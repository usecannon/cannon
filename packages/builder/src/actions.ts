import { z } from 'zod';
import { AccessComputationResult } from './access-recorder';
import { handleZodErrors } from './error/zod';
import { ChainBuilderRuntime } from './runtime';
import { chainDefinitionSchema } from './schemas';
import cloneSpec from './steps/clone';
import deploySpec from './steps/deploy';
import invokeSpec from './steps/invoke';
import keeperSpec from './steps/keeper';
import pullSpec from './steps/pull';
import routerSpec from './steps/router';
import diamondSpec from './steps/diamond';
import varSpec from './steps/var';
import { ChainArtifacts, ChainBuilderContext, PackageState } from './types';

export interface RawConfig {
  description?: string;
  depends?: string[];
}

export interface CannonAction<Config extends RawConfig = any> {
  label: string;

  configInject: (ctx: ChainBuilderContext, config: Config, packageState: PackageState) => Config;

  getState: (
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    config: Config,
    packageState: PackageState
  ) => Promise<any[] | null>;

  /**
   * Returns a list of state keys that this operation consumes (used for dependency inference)
   */
  getInputs?: (config: Config, possibleFields: string[], packageState: PackageState) => AccessComputationResult;

  /**
   * Returns a list of state keys this operation produces (used for dependency inference)
   */
  getOutputs?: (config: Config, packageState: PackageState) => string[];

  exec: (
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    config: Config,
    packageState: PackageState
  ) => Promise<ChainArtifacts>;

  importExisting?: (
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    config: Config,
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

export function checkConfig(schema: z.ZodSchema, config: any) {
  const result = schema.safeParse(config);

  if (!result.success) {
    return result.error.errors;
  }

  return null;
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
registerAction(diamondSpec);
registerAction(varSpec);

// backwards compatibility
registerAction(Object.assign({}, deploySpec, { label: 'contract' }));
registerAction(Object.assign({}, pullSpec, { label: 'import' }));
registerAction(Object.assign({}, cloneSpec, { label: 'provision' }));
registerAction(Object.assign({}, varSpec, { label: 'setting' }));
