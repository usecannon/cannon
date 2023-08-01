import { z } from 'zod';
import importSpec from './steps/import';

/// ================================ INPUT CONFIG SCHEMAS ================================ \\\

export const contractSchema = z
  .object({
    /**
     *    Artifact name of the target contract
     *  @example 
      *  ```toml
      *  [contract.synthetix]
            artifact = "Synthetix"
            ...
      *  ```
     */
    artifact: z.string(),
  })
  .merge(
    /**
     *    Optional Properties
     */
    z
      .object({
        /**
         *    Determines whether to deploy the contract using create2
         */
        create2: z.boolean(),
        /**
         *    Contract deployer address
         */
        from: z.string(),
        nonce: z.string(),
        /**
         *    Abi of the contract being deployed
         */
        abi: z.string(),
        abiOf: z.array(z.string()),
        /**
         *    Constructor args
         */
        args: z.array(z.any()),
        /**
         *    Object containing list of libraries
         */
        libraries: z.record(z.string()),

        /**
         *   Used to force new copy of a contract (not actually used)
         */
        salt: z.string(),

        /**
         *   Native currency value to into the deploy transaction
         */
        value: z.string(),
        /**
         *   Override settings for deployment
         */
        overrides: z.object({
          gasLimit: z.string(),
        }),

        /**
         *  List of steps that this action depends on
         */
        depends: z.array(z.string()),
      })
      .deepPartial()
  );

export const importSchema = z
  .object({
    /**
     *  Source of the cannonfile package to import from
     *  @example
     *  ```toml
        [import.synthetix-sandbox]
         source = "synthetix-sandbox"
         ...
     *  ```
     */
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
    target: z.array(z.string()).nonempty(),
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

export const keeperSchema = z
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

/**
 * @internal NOTE: if you edit this schema, please also edit the constructor of ChainDefinition in 'definition.ts' to account for non-action components
 */
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
        import: z.custom<typeof importSpec>(),
      })
      .deepPartial()
  );
