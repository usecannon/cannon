import { z } from 'zod';
import { handleZodErrors } from './error/zod';

/// ================================ INPUT CONFIG SCHEMAS ================================ \\\

export const contractSchema = z
  .object({
    artifact: z.string(),
  })
  .merge(
    z
      .object({
        create2: z.boolean(),
        from: z.string(),
        nonce: z.string(),
        abi: z.string(),
        abiOf: z.array(z.string()),
        args: z.array(z.any()),
        libraries: z.record(z.string()),

        // used to force new copy of a contract (not actually used)
        salt: z.string(),

        value: z.string(),
        overrides: z.object({
          gasLimit: z.string(),
        }),

        depends: z.array(z.string()),
      })
      .deepPartial()
  );

export const importSchema = z
  .object({
    source: z.string(),
  })
  .merge(
    z
      .object({
        chainId: z.number().int(),
        preset: z.string(),
        depends: z.array(z.string()),
      })
      .deepPartial()
  );

export const invokeSchema = z
  .object({
    target: z.array(z.string()).nonempty().max(1),
    func: z.string(),
  })
  .merge(
    z
      .object({
        abi: z.string(),

        args: z.array(z.any()),
        from: z.string(),
        fromCall: z
          .object({
            func: z.string(),
          })
          .merge(
            z.object({
              args: z.array(z.any()),
            })
          ),
        value: z.string(),
        overrides: z.object({
          gasLimit: z.string(),
        }),
        extra: z.record(
          z.object({
            event: z.string(),
            arg: z.number().int(),

            allowEmptyEvents: z.boolean().optional(),
          })
        ),
        factory: z.record(
          z.object({
            event: z.string(),
            arg: z.number().int(),

            artifact: z.string().optional(),
            abiOf: z.array(z.string()).optional(),
            constructorArgs: z.array(z.any()).optional(),
            allowEmptyEvents: z.boolean().optional(),
          })
        ),
        depends: z.array(z.string()),
      })
      .deepPartial()
  );

export const provisionSchema = z
  .object({
    source: z.string(),
  })
  .merge(
    z
      .object({
        chainId: z.number().int(),
        sourcePreset: z.string(),
        targetPreset: z.string(),
        options: z.record(z.string()),
        tags: z.array(z.string()),
        depends: z.array(z.string()),
      })
      .deepPartial()
  );

export const chainDefinitionScriptSchema = z
  .object({
    exec: z.string(),
  })
  .merge(
    z
      .object({
        args: z.array(z.string()),
        env: z.array(z.string()),
      })
      .deepPartial()
  );

export const chainDefinitionSchema = z
  .object({
    name: z.string(),
    version: z.string(),
  })
  .merge(
    z
      .object({
        description: z.string(),
        keywords: z.array(z.string()),
        setting: z.record(
          z
            .object({
              description: z.string(),
              type: z.enum(['number', 'string', 'boolean']),
              defaultValue: z.string(),
            })
            .partial()
        ),
        import: z.object({ importSchema }),
      })
      .deepPartial()
  );

export const runSchema = z
  .object({
    exec: z.string(),
    func: z.string(),
    modified: z.array(z.string()).nonempty(),
  })
  .merge(
    z
      .object({
        args: z.array(z.string()),
        env: z.array(z.string()),
        depends: z.array(z.string()),
      })
      .deepPartial()
  );

/// ================================ TS TYPE DEFINITIONS ================================ \\\

// General validation schema.
// Anytime an attribute is added to any of the zod schemas above it must be added to this

// All properties are made optional since all schemas that
// are validated against this are a partial object of this schema.
export type ConfigValidationSchema = z.ZodObject<{
  // Properties
  target?: z.ZodArray<z.ZodString, 'atleastone'>;
  exec?: z.ZodString;
  func?: z.ZodString;
  modified?: z.ZodArray<z.ZodString, 'atleastone'>;
  artifact?: z.ZodString;
  source?: z.ZodString;

  // Optional Properties
  chainId?: z.ZodOptional<z.ZodNumber>;
  preset?: z.ZodOptional<z.ZodString>;
  args?: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>> | z.ZodOptional<z.ZodArray<z.ZodAny, 'many'>>;
  env?: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
  depends?: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
  create2?: z.ZodOptional<z.ZodBoolean>;
  from?: z.ZodOptional<z.ZodString>;
  fromCall?: z.ZodOptional<
    z.ZodObject<{
      func: z.ZodOptional<z.ZodString>;
      args: z.ZodOptional<z.ZodArray<z.ZodAny, 'many'>>;
    }>
  >;
  nonce?: z.ZodOptional<z.ZodString>;
  abi?: z.ZodOptional<z.ZodString>;
  abiOf?: z.ZodOptional<z.ZodArray<z.ZodString>>;
  libraries?: z.ZodOptional<z.ZodRecord<z.ZodString>>;
  salt?: z.ZodOptional<z.ZodString>;
  value?: z.ZodOptional<z.ZodString>;
  overrides?: z.ZodOptional<
    z.ZodObject<{
      gasLimit?: z.ZodOptional<z.ZodString>;
    }>
  >;
  extra?: z.ZodOptional<
    z.ZodRecord<
      z.ZodString,
      z.ZodObject<{
        event: z.ZodString;
        arg: z.ZodNumber;
        allowEmptyEvents: z.ZodOptional<z.ZodBoolean>;
      }>
    >
  >;
  factory?: z.ZodOptional<
    z.ZodRecord<
      z.ZodString,
      z.ZodObject<{
        event: z.ZodString;
        arg: z.ZodNumber;
        artifact: z.ZodOptional<z.ZodString>;
        abiOf: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
        constructorArgs: z.ZodOptional<z.ZodArray<z.ZodAny, 'many'>>;
        allowEmptyEvents: z.ZodOptional<z.ZodBoolean>;
      }>
    >
  >;
}>;

/**
 *  Available properties for contract step
 *  @namespace
 */
export type ContractConfig = z.infer<typeof contractSchema>;

/**
 *  Available properties for import step
 *  @namespace
 */
export type ImportConfig = z.infer<typeof importSchema>;

/**
 *  Available properties for invoke step
 *  @namespace
 */
export type InvokeConfig = z.infer<typeof invokeSchema>;

/**
 *  Available properties for provision step
 *  @namespace
 */
export type ProvisionConfig = z.infer<typeof provisionSchema>;

/**
 *  Available properties for run step
 *  @namespace
 */
export type RunConfig = z.infer<typeof runSchema>;

/**
 *  Available properties for keeper step
 *  @namespace
 */
export type ChainDefinitionScriptConfig = z.infer<typeof chainDefinitionScriptSchema>;

/**
 *  Available properties for top level config
 *  @namespace
 */
export type ChainDefinitionConfig = z.infer<typeof chainDefinitionSchema>;

/// ================================ SCHEMA VALIDATION ================================ \\\

const Schemas = {
  contract: contractSchema,
  import: importSchema,
  invoke: invokeSchema,
  provision: provisionSchema,
  keeper: chainDefinitionScriptSchema,
  run: runSchema,
};

type StepConfigs = ContractConfig | ImportConfig | InvokeConfig | ChainDefinitionScriptConfig | ProvisionConfig | RunConfig;

export function validateStepConfig(step: keyof typeof Schemas, config: StepConfigs) {
  const result = Schemas[step].safeParse(config);

  if (!result.success) {
    const errors = result.error.errors;
    handleZodErrors(errors);
  }

  return result;
}
