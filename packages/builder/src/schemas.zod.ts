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
// <%=  string interpolation %>, step.names or property.names, packages:versions
const interpolatedRegex = RegExp(/^<%=\s\w+.+[\w()[\]-]+\s%>$/, 'i');
const stepRegex = RegExp(/^[\w-]+\.[.\w-]+$/, 'i');
const packageRegex = RegExp(/^[\w-]+\.*:*[\w.-]+$/, 'i');
const jsonAbiPathRegex = RegExp(/^(?!.*\.d?$).*\.json?$/, 'i');

// This regex matches artifact names which are just capitalized words like solidity contract names
const artifactNameRegex = RegExp(/^[A-Z]{1}[\w]+$/, 'i');
const artifactPathRegex = RegExp(/^.*\.sol:\w+/, 'i');

// Invoke target string schema
const targetString = z.string().refine(
  (val) =>
    ethers.utils.isAddress(val) ||
    !!val.match(interpolatedRegex) ||
    !!val.match(stepRegex) ||
    !!val.match(artifactNameRegex) ||
    !!val.match(artifactPathRegex),
  (val) => ({
    message: `"${val}" must be a valid ethereum address, existing contract step name, contract artifact name or filepath`,
  })
);

const targetSchema = targetString.or(z.array(targetString).nonempty());

export const contractSchema = z
  .object({
    /**
     *    Artifact name or path of the target contract
     */
    artifact: z.string().refine(
      (val) => !!val.match(artifactNameRegex) || !!val.match(artifactPathRegex),
      (val) => ({ message: `Artifact name or path "${val}" is invalid` })
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
          (val) => ethers.utils.isAddress(val) || !!val.match(interpolatedRegex),
          (val) => ({ message: `"${val}" is not a valid ethereum address` })
        ),
        nonce: z.string().refine(
          (val) => ethers.utils.isHexString(val) || !!parseInt(val),
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
              !!val.match(artifactNameRegex) ||
              !!val.match(jsonAbiPathRegex) ||
              !!val.match(interpolatedRegex) ||
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
            (val) => !!val.match(artifactNameRegex) || !!val.match(stepRegex),
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
         *   Native currency value to send in the transaction
         */
        value: z.string().refine((val) => !!ethers.utils.parseEther(val), {
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
            (val) => !!val.match(stepRegex),
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
     *  Can be a cannonfile step name or package name
     */
    source: z.string().refine(
      (val) => !!val.match(packageRegex) || !!val.match(stepRegex) || !!val.match(interpolatedRegex),
      (val) => ({
        message: `Source value: ${val} must match package format "package:version" or step format "import.Contract" or be an interpolated value`,
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
            (val) => !!val.match(stepRegex),
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
     *  Names of the contract to call or contract action that deployed the contract to call
     */
    target: targetSchema,
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
              !!val.match(artifactNameRegex) ||
              !!val.match(jsonAbiPathRegex) ||
              !!val.match(interpolatedRegex) ||
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
          (val) => ethers.utils.isAddress(val) || !!val.match(interpolatedRegex),
          (val) => ({ message: `"${val}" must be a valid ethereum address` })
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
        value: z.string().refine((val) => !!ethers.utils.parseEther(val), {
          message: 'Field must be of numeric value',
        }),
        /**
         *   Override transaction settings
         */
        overrides: z.object({
          gasLimit: z.string().refine((val) => !!parseInt(val), { message: 'Gas limit is invalid' }),
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
             *   number of matching contract events which should be seen by this event (default 1) (set to 0 to make optional)
             */
            expectCount: z.number().int().optional(),

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
               *   number of matching contract events which should be seen by this event (default 1) (set to 0 to make optional)
               */
              expectCount: z.number().int().optional(),

              /**
               *   name of the contract artifact
               */
              artifact: z
                .string()
                .refine(
                  (val) => !!val.match(artifactNameRegex) || !!val.match(artifactPathRegex),
                  (val) => ({ message: `"${val}" must match a contract artifact name or path` })
                )
                .optional(),

              /**
               *  An array of contract artifacts that have already been deployed with Cannon.
               *  Used if the code for the deployed contract is not available in the artifacts.
               */
              abiOf: z
                .array(
                  z.string().refine(
                    (val) => !!val.match(artifactNameRegex) || !!val.match(stepRegex),
                    (val) => ({
                      message: `"${val}" must match a previously defined contract step name or contract artifact name or path`,
                    })
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
            (val) => !!val.match(stepRegex),
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
      (val) => !!val.match(packageRegex) || !!val.match(interpolatedRegex),
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
         *  @default - 13370
         */
        chainId: z.number().int(),
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
            (val) => !!val.match(stepRegex),
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
      .refine((val) => !!val.match(RegExp(/[a-zA-Z0-9-]+/, 'gm')), {
        message: 'Name cannot contain any special characters',
      }),
    /**
     *  version of the package
     */
    version: z
      .string()
      .max(31)
      .refine((val) => !!val.match(RegExp(/[\w.]+/, 'gm')), {
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
