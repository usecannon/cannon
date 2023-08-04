import { z } from 'zod';
import importSpec from './steps/import';
import { ethers } from 'ethers';

/// ================================ INPUT CONFIG SCHEMAS ================================ \\\

// Different types that can be passed into the args schema property
// Basically just a union as follows:
// string | number | (string | number)[] | Record<string, string | number>
const argtype = z.union([z.string(), z.number(), z.boolean()]);
const argtype2 = z.array(argtype);
const argtype3 = z.record(z.string(), argtype);
const argtype4 = z.array(argtype3);
const argsUnion = z.union([argtype, argtype2, argtype3, argtype4]);

// Different regular expressions used to validate formats like
// general string interpolation, action names, contract artifacts and packages
let interpolatedRegex = RegExp(/^<%=\s\w+.+[\w()-]+\s%>$/, 'gm');
let actionRegex = RegExp(/^[\w-]+\.[\w-]+$/, 'gm');
let packageRegex = RegExp(/^[\w.-]+:[\w.-]+$/, 'gm');
let settingsRegex = RegExp(/^<%=\ssettings.[\w.-]+\s%>/, 'gm'); // only allow for interpolated settings property
let artifactRegex = RegExp(/^[\w\/.:-]+$/, 'gm');

export const contractSchema = z
  .object({
    /**
     *    Artifact name of the target contract
     */
    artifact: z.string().refine(
      (val) => Boolean(val.match(artifactRegex)),
      (val) => ({ message: `Artifact name "${val}" is invalid` })
    ),
  })
  .merge(
    z
      .object({
        /**
         *    Determines whether to deploy the contract using create2
         */
        create2: z.boolean(),
        /**
         *    Contract deployer address.
         *    Must match the ethereum address format
         */
        from: z.string().refine(
          (val) => ethers.utils.isAddress(val) || Boolean(val.match(interpolatedRegex)),
          (val) => ({ message: `"${val}" is not a valid ethereum address` })
        ),
        nonce: z.string().refine(
          (val) => ethers.utils.isHexString(val) || Boolean(parseInt(val)),
          (val) => ({
            message: `Nonce ${val} must be of numeric or hexadecimal value`,
          })
        ),
        /**
         *  Abi of the contract being deployed
         */
        abi: z
          .string()
          .refine(
            (val) =>
              Boolean(val.match(artifactRegex) || val.match(settingsRegex)) ||
              ethers.utils.Fragment.isFragment(new ethers.utils.Interface(val).fragments[0]),
            {
              message:
                'ABI must be a valid JSON ABI string, see more here: https://docs.soliditylang.org/en/latest/abi-spec.html#json',
            }
          ),
        /**
         * An array of contract artifacts that have already been deployed with Cannon.
         * This is useful when deploying proxy contracts.
         */
        abiOf: z.array(
          z.string().refine(
            (val) => Boolean(val.match(artifactRegex)),
            (val) => ({ message: `Artifact name ${val} is invalid` })
          )
        ),
        /**
         *    Constructor or initializer args
         */
        args: z.array(argsUnion),
        /**
         *  An array of contract action names that deploy libraries this contract depends on.
         */
        libraries: z.record(z.string()),

        /**
         *   Used to force new copy of a contract (not actually used)
         */
        salt: z.string(),

        /**
         *   Native currency value to into the deploy transaction
         */
        value: z.string().refine((val) => Boolean(ethers.utils.parseEther(val)), {
          message: 'Field value must be of numeric value',
        }),
        /**
         *   Override transaction settings
         */
        overrides: z.object({
          gasLimit: z.string(),
        }),

        /**
         *  List of steps that this action depends on
         */
        depends: z.array(
          z.string().refine(
            (val) => Boolean(val.match(actionRegex)),
            (val) => ({
              message: `Bad format for "${val}". Must reference a previous step, example: 'contract.Storage'`,
            })
          )
        ),
      })
      .deepPartial()
  );

export const importSchema = z
  .object({
    /**
     *  Source of the cannonfile package to import from
     */
    source: z.string().refine(
      (val) => Boolean(val.match(packageRegex) || val.match(interpolatedRegex)),
      (val) => ({
        message: `Source value: ${val} must match package format "package:version" or be an interpolated value`,
      })
    ),
  })
  .merge(
    z
      .object({
        /**
         *  ID of the chain to import the package from
         */
        chainId: z.number().int(),
        /**
         *  Preset label of the package being imported
         */
        preset: z.string(),
        /**
         *  Previous steps this step is dependent on
         *  @example
         *  ```toml
         *  depends = ['contract.Storage', 'import.Contract']
         * ```
         */
        depends: z.array(
          z.string().refine(
            (val) => Boolean(val.match(actionRegex)),
            (val) => ({
              message: `"${val}" is invalid. Must reference a previous step, example: 'contract.Storage'`,
            })
          )
        ),
      })
      .deepPartial()
  );

export const invokeSchema = z
  .object({
    /**
     *  Name of the contract action that deployed the contract to call
     */
    target: z
      .array(
        z.string().refine(
          (val) => ethers.utils.isAddress(val) || 
            Boolean(val.match(interpolatedRegex) || val.match(artifactRegex)),
          (val) => ({
            message: `"${val}" must be a valid ethereum address or artifact name`,
          })
        )
      )
      .nonempty()
      .max(1),
    /**
     *  Name of the function to call on the contract
     */
    func: z.string(),
  })
  .merge(
    z
      .object({
        /**
         *  JSON file of the contract ABI
         *  Required if the target contains an address rather than a contract action name.
         */
        abi: z
          .string()
          .refine(
            (val) =>
              Boolean(val.match(artifactRegex) || val.match(settingsRegex)) ||
              ethers.utils.Fragment.isFragment(new ethers.utils.Interface(val).fragments[0]),
            {
              message:
                'ABI must be a valid JSON ABI string, see more here: https://docs.soliditylang.org/en/latest/abi-spec.html#json',
            }
          ),

        /**
         *  Arguments to use when invoking this call.
         */
        args: z.array(argsUnion),
        /**
         *  The calling address to use when invoking this call.
         */
        from: z.string().refine(
          (val) => ethers.utils.isAddress(val) || Boolean(val.match(interpolatedRegex)),
          (val) => ({ message: `"${val}" must be a valid ethereum address or artifact name` })
        ),

        fromCall: z.object({
          /**
           *  The name of a view function to call on this contract. The result will be used as the from input.
           */
          func: z.string(),
          /**
           *  The arguments to pass into the function being called.
           */
          args: z.array(argsUnion).optional(),
        }),
        /**
         *  The amount of ether/wei to send in the transaction.
         */
        value: z.string().refine((val) => Boolean(ethers.utils.parseEther(val)), {
          message: 'Field value must be of numeric value',
        }),
        /**
         *   Override transaction settings
         */
        overrides: z.object({
          gasLimit: z.string().refine((val) => Boolean(parseInt(val)), {
            message: 'Gas limit is invalid',
          }),
        }),
        /**
         *   Object defined to hold extra transaction result data.
         *   For now its limited to getting event data so it can be reused in other steps
         */
        extra: z.record(
          z.object({
            /**
             *   Name of the event to get data for
             */
            event: z.string(),
            /**
             *   data argument of the event output
             */
            arg: z.number().int(),
            /**
             *   Bypass error messages if an event is expected in the invoke action but none are emitted in the transaction.
             */
            allowEmptyEvents: z.boolean().optional(),
          })
        ),
        /**
         *   Object defined to hold deployment transaction result data.
         *   For now its limited to getting deployment event data so it can be reused in other steps
         */
        factory: z
          .record(
            z.object({
              /**
               *   Name of the event to get data for
               */
              event: z.string(),
              /**
               *   data argument of the event output
               */
              arg: z.number().int(),

              /**
               *   name of the contract artifact
               */
              artifact: z
                .string()
                .refine(
                  (val) => Boolean(val.match(artifactRegex)),
                  (val) => ({ message: `Artifact name "${val}" is invalid` })
                )
                .optional(),

              /**
               *  An array of contract artifacts that have already been deployed with Cannon.
               *  Used if the code for the deployed contract is not available in the artifacts.
               */
              abiOf: z
                .array(
                  z.string().refine(
                    (val) => Boolean(val.match(artifactRegex)),
                    (val) => ({ message: `Artifact name "${val}" is invalid` })
                  )
                )
                .optional(),

              /**
               *
               */
              constructorArgs: z.array(argsUnion).optional(),
              /**
               *   Bypass error messages if an event is expected in the invoke action but none are emitted in the transaction.
               */
              allowEmptyEvents: z.boolean().optional(),
            })
          )
          .optional(),
        /**
         *  Previous steps this step is dependent on
         */
        depends: z.array(
          z.string().refine(
            (val) => Boolean(val.match(actionRegex)),
            (val) => ({
              message: `"${val}" is invalid. Must reference a previous step, example: 'contract.Storage'`,
            })
          )
        ),
      })
      .partial()
  );

export const provisionSchema = z
  .object({
    /**
     *  Name of the package to provision
     */
    source: z.string().refine(
      (val) => Boolean(val.match(packageRegex) || val.match(interpolatedRegex)),
      (val) => ({
        message: `Source value: ${val} must match package format package:version or be an interpolated value`,
      })
    ),
  })
  .merge(
    z
      .object({
        /**
         *  ID of the chain to import the package from
         *  @default - 13370
         */
        chainId: z.number().int().max(31),
        /**
         *  Override the preset to use when provisioning this package.
         *  @default - "main"
         */
        sourcePreset: z.string(),
        /**
         *  Set the new preset to use for this package.
         *  @default - "main"
         */
        targetPreset: z.string(),
        /**
         *  The settings to be used when initializing this Cannonfile.
         *  Overrides any defaults preset in the source package.
         */
        options: z.record(z.string()),
        /**
         * Additional tags to set on the registry for when this provisioned package is published.
         */
        tags: z.array(z.string()),
        /**
         *  Previous steps this step is dependent on
         */
        depends: z.array(
          z.string().refine(
            (val) => Boolean(val.match(actionRegex)),
            (val) => ({
              message: `"${val}" is invalid. Must reference a previous step, example: 'contract.Storage'`,
            })
          )
        ),
      })
      .deepPartial()
  );

/**
 * @internal NOTE: if you edit this schema, please also edit the constructor of ChainDefinition in 'definition.ts' to account for non-action components
 */
export const chainDefinitionSchema = z
  .object({
    /**
     * Name of the package
     */
    name: z
      .string()
      .max(31)
      .refine((val) => Boolean(val.match(RegExp(/[a-zA-Z0-9-]+/, "gm"))), {
        message: 'Name cannot contain any special characters',
      }),
    /**
     *  version of the package
     */
    version: z
      .string()
      .max(31)
      .refine((val) => Boolean(val.match(RegExp(/[\w.]+/, "gm"))), {
        message: 'Version cannot contain any special characters',
      }),
  })
  .merge(
    z
      .object({
        /**
         * Description for the package
         */
        description: z.string(),
        /**
         * keywords for search indexing
         */
        keywords: z.array(z.string()),
        /**
         * Object that allows the definition of values for use in next steps
         * @example
         * ```toml
         *  [settings.owner]
         *  defaultValue: "some-eth-address"
         * ```
         */
        setting: z.record(
          z
            .object({
              /**
               * Description for the setting
               */
              description: z.string(),
              /**
               * Data type of the value being stored
               */
              type: z.enum(['number', 'string', 'boolean']),
              /**
               * Stored value of the setting
               */
              defaultValue: z.string(),
            })
            .partial()
        ),
        /**
         * @internal
         */
        import: z.custom<typeof importSpec>(),
      })
      .deepPartial()
  );
