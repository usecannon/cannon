import { ChainBuilderRuntime } from './runtime';

import { z } from 'zod';

import contractSpec from './steps/contract';

import importSpec from './steps/import';
import {configSchema} from './steps/import';

import invokeSpec from './steps/invoke';
import keeperSpec from './steps/keeper';
import provisionSpec from './steps/provision';
import { ChainArtifacts, ChainBuilderContext, ChainBuilderContextWithHelpers, PackageState } from './types';
import { ValidationSchema } from './types.zod';

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

  validate: ValidationSchema,

  timeout?: number;
}

/**
 * All the different types (and their implementations)
 */
export const ActionKinds: { [label: string]: CannonAction } = {};

/**
 * NOTE: if you edit this schema, please also edit the constructor of `ChainDefinition` to account for non-action components of
 */

const ChainDefinitionSchema = z
  .object({
    name: z.string({
      required_error: 'name is required',
      invalid_type_error: 'name must be a string',
    }),
    version: z.string({
      required_error: 'version is required',
      invalid_type_error: 'version must be a string',
    }),
  })
  .merge(
    z
      .object({
        description: z.string(),
        keywords: z.array(z.string({
          invalid_type_error: "keywords must be strings",
        })),
        setting: z.record(z.object({
          description: z.string({
            invalid_type_error: "description must be a string",
          }),
          type: z.enum(['number', 'string', 'boolean']),
          defaultValue: z.string({
            invalid_type_error: "defaultValue must be a string",
          }),
        }).deepPartial()),
        import: z.object({configSchema}),
      })
      .deepPartial()
  );

export type RawChainDefinition = z.infer<typeof ChainDefinitionSchema>;

export function validateChainDefinitionSchema(def: RawChainDefinition) {
  return ChainDefinitionSchema.parse(def);
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
    ChainDefinitionSchema.pick({
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
