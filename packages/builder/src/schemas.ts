import * as viem from 'viem';
import { z } from 'zod';

/// ================================ INPUT CONFIG SCHEMAS ================================ \\\

// Different types that can be passed into the args schema property
const argtype: z.ZodLazy<any> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), argtype), z.array(argtype)])
);

// Different regular expressions used to validate formats like
// <%=  string interpolation %>, step.names or property.names, packages:versions
const interpolatedRegex = RegExp(/\w*<%= [^%]* %>\w*|[^<%=]*<%= [^%]* %>[^<%=]*/, 'i');
const stepRegex = RegExp(/^[\w-]+\.[.\w-]+$/, 'i');
const packageRegex = RegExp(/^(?<name>@?[a-z0-9][a-z0-9-]{1,}[a-z0-9])(?::(?<version>[^@]+))?(@(?<preset>[^\s]+))?$/, 'i');
const jsonAbiPathRegex = RegExp(/^(?!.*\.d?$).*\.json?$/, 'i');

// This regex matches artifact names which are just capitalized words like solidity contract names
const artifactNameRegex = RegExp(/^[A-Z]{1}[\w]+$/, 'i');
const artifactPathRegex = RegExp(/^.*\.sol:\w+/, 'i');

// Because of a weird type cohercion, after using viem.isAddress during website build,
// the string type of the given value gets invalid to "never", and breaks the build.
const isAddress = (val: any): boolean => typeof val === 'string' && viem.isAddress(val);

// Invoke target string schema
const targetString = z.string().refine(
  (val) =>
    !!isAddress(val) ||
    !!val.match(interpolatedRegex) ||
    !!val.match(stepRegex) ||
    !!val.match(artifactNameRegex) ||
    !!val.match(artifactPathRegex),
  (val) => ({
    message: `"${val}" must be a valid ethereum address, existing contract operation name, contract artifact name or filepath`,
  })
);

// stolen from https://stackoverflow.com/questions/3710204/how-to-check-if-a-string-is-a-valid-json-string
function tryParseJson(jsonString: string) {
  try {
    const o = JSON.parse(jsonString);

    // Handle non-exception-throwing cases:
    // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
    // but... JSON.parse(null) returns null, and typeof null === "object",
    // so we must check for that, too. Thankfully, null is falsey, so this suffices:
    if (o && typeof o === 'object') {
      return o;
    }
  } catch (e) {
    // do nothing
  }

  return undefined;
}

// Note: The first schema defined contains required properties, we then merge a schema with the `deepPartial` function which contains the optional properties

const targetSchema = targetString.or(z.array(targetString).nonempty());

export const deploySchema = z
  .object({
    /**
     *    Artifact name of the target contract
     */
    artifact: z
      .string()
      .refine(
        (val) => !!val.match(artifactNameRegex) || !!val.match(artifactPathRegex),
        (val) => ({ message: `Artifact name "${val}" is invalid` })
      )
      .describe('Artifact name of the target contract'),
  })
  .merge(
    z
      .object({
        /**
         * Description of the operation
         */
        description: z.string().describe('Description of the operation'),
        /**
         * Determines whether contract should get priority in displays
         */
        highlight: z.boolean().describe('Determines whether contract should get priority in displays'),
        /**
         * Determines whether to deploy the contract using create2
         */
        create2: z
          .union([z.boolean(), z.string().refine((val) => isAddress(val))])
          .describe(
            'Determines whether to deploy the contract using create2. If an address is specified, the arachnid create2 contract will be deployed/used from this address.'
          ),
        /**
         * Determines whether to deploy the contract using create2
         */
        ifExists: z
          .enum(['continue'])
          .optional()
          .describe(
            'When deploying a contract with CREATE2, determines the behavior when the target contract is already deployed (ex. due to same bytecode and salt). Set to continue to allow the build to continue if the contract is found to have already been deployed. By default, an error is thrown and the action is halted.'
          ),
        /**
         * Contract deployer address.
         * Must match the ethereum address format
         */
        from: z
          .string()
          .refine(
            (val) => isAddress(val) || !!val.match(interpolatedRegex),
            (val) => ({ message: `"${val}" is not a valid ethereum address` })
          )
          .describe('Contract deployer address. Must match the ethereum address format'),
        nonce: z
          .union([z.string(), z.number()])
          .refine(
            (val) => viem.isHex(val) || Number.isFinite(parseInt(val.toString())),
            (val) => ({
              message: `Nonce ${val} must be a string, number or hexadecimal value`,
            })
          )
          .transform((val) => {
            return val.toString();
          })
          .describe('-'),
        /**
         * Abi of the contract being deployed
         */
        abi: z
          .string()
          .refine(
            (val) =>
              !!val.match(artifactNameRegex) ||
              !!val.match(jsonAbiPathRegex) ||
              !!val.match(interpolatedRegex) ||
              tryParseJson(val),
            {
              message:
                'ABI must be a valid JSON ABI string or artifact name or artifact name, see more here: https://docs.soliditylang.org/en/latest/abi-spec.html#json',
            }
          )
          .describe('Abi of the contract being deployed'),
        /**
         * An array of contract artifacts that have already been deployed with Cannon.
         * This is useful when deploying proxy contracts.
         */
        abiOf: z
          .array(
            z.string().refine(
              (val) => !!val.match(artifactNameRegex) || !!val.match(stepRegex),
              (val) => ({ message: `Artifact name ${val} is invalid` })
            )
          )
          .describe(
            'An array of contract artifacts that have already been deployed with Cannon. This is useful when deploying proxy contracts.'
          ),
        /**
         *  Constructor or initializer args
         */
        args: z.array(argtype).describe('Constructor or initializer args'),
        /**
         *  An array of contract operation names that deploy libraries this contract depends on.
         */
        libraries: z
          .record(z.string())
          .describe('An array of contract operation names that deploy libraries this contract depends on.'),

        /**
         *   Used to force new copy of a contract (not actually used)
         */
        salt: z.string().describe('Used to force new copy of a contract (not actually used)'),

        /**
         *   Native currency value to send in the transaction
         */
        value: z
          .string()
          .refine((val) => !!val.match(interpolatedRegex) || !!viem.parseEther(val), {
            message: 'Field value must be of numeric value',
          })
          .describe('Native currency value to send in the transaction'),
        /**
         *   Override transaction settings
         */
        overrides: z
          .object({
            gasLimit: z.string(),
            simulate: z.boolean(),
          })
          .describe('Override transaction settings'),

        /**
         *  List of operations that this operation depends on, which Cannon will execute first. If unspecified, Cannon automatically detects dependencies.
         */
        depends: z
          .array(
            z.string().refine(
              (val) => !!val.match(stepRegex),
              (val) => ({
                message: `Bad format for "${val}". Must reference a previous operation, example: 'contract.Storage'`,
              })
            )
          )
          .describe(
            'List of operations that this operation depends on, which Cannon will execute first. If unspecified, Cannon automatically detects dependencies.'
          ),
      })
      .deepPartial()
  )
  .strict();

export const pullSchema = z
  .object({
    /**
     *  Source of the cannonfile package to import from.
     *  Can be a cannonfile operation name or package name
     */
    source: z
      .string()
      .refine(
        (val) => !!val.match(packageRegex) || !!val.match(stepRegex) || !!val.match(interpolatedRegex),
        (val) => ({
          message: `Source value: ${val} must match package formats: "package:version" or "package:version@preset" or operation name "import.Contract" or be an interpolated value`,
        })
      )
      .refine(
        (val) => {
          const match = val.match(packageRegex);

          if (match) {
            const nameSize = match!.groups!.name.length;

            return nameSize <= 32;
          } else {
            return true;
          }
        },
        (val) => ({ message: `Package reference "${val}" is too long. Package name exceeds 32 bytes` })
      )
      .refine(
        (val) => {
          const match = val.match(packageRegex);

          if (match && match!.groups!.version) {
            const versionSize = match!.groups!.version.length;

            return versionSize <= 32;
          } else {
            return true;
          }
        },
        (val) => ({ message: `Package reference "${val}" is too long. Package version exceeds 32 bytes` })
      )
      .describe('Source of the cannonfile package to import from. Can be a cannonfile operation name or package name'),
  })
  .merge(
    z
      .object({
        /**
         * Description of the operation
         */
        description: z.string().describe('Description of the operation'),
        /**
         *  ID of the chain to import the package from
         */
        chainId: z.number().int().describe('ID of the chain to import the package from'),
        /**
         *  Preset label of the package being imported
         */
        preset: z.string().describe('Preset label of the package being imported'),
        /**
         *  Previous operations this operation is dependent on
         *  ```toml
         *    depends = ['contract.Storage', 'import.Contract']
         *  ```
         */
        depends: z
          .array(
            z.string().refine(
              (val) => !!val.match(stepRegex),
              (val) => ({
                message: `"${val}" is invalid. Must reference a previous operation, example: 'contract.Storage'`,
              })
            )
          )
          .describe(
            'List of operations that this operation depends on, which Cannon will execute first. If unspecified, Cannon automatically detects dependencies.'
          ),
      })
      .deepPartial()
  )
  .strict();

const invokeVarRecord = z
  .record(
    z
      .object({
        /**
         *   Name of the event to get data for
         */
        event: z.string().describe('Name of the event to get data for'),
        /**
         *   Data argument of the event output
         */
        arg: z.number().int().describe('Data argument of the event output'),
        /**
         *   Number of matching contract events which should be seen by this event (default 1) (set to 0 to make optional)
         */
        expectCount: z
          .number()
          .int()
          .optional()
          .describe(
            'Number of matching contract events which should be seen by this event (default 1) (set to 0 to make optional)'
          ),

        /**
         *   Bypass error messages if an event is expected in the invoke operation but none are emitted in the transaction.
         */
        allowEmptyEvents: z
          .boolean()
          .optional()
          .describe(
            'Bypass error messages if an event is expected in the invoke operation but none are emitted in the transaction.'
          ),
      })
      .strict()
  )
  .describe(
    'Object defined to hold transaction result data in a setting. For now its limited to getting event data so it can be reused in other operations'
  );

export const invokeSchema = z
  .object({
    /**
     *  Names of the contract to call or contract operation that deployed the contract to call
     */
    target: targetSchema.describe('Names of the contract to call or contract operation that deployed the contract to call'),
    /**
     *  Name of the function to call on the contract
     */
    func: z.string().describe('Name of the function to call on the contract'),
  })
  .merge(
    z
      .object({
        /**
         * Description of the operation
         */
        description: z.string().describe('Description of the operation'),
        /**
         *  JSON file of the contract ABI.
         *  Required if the target contains an address rather than a contract operation name.
         */
        abi: z
          .string()
          .refine(
            (val) =>
              !!val.match(artifactNameRegex) ||
              !!val.match(jsonAbiPathRegex) ||
              !!val.match(interpolatedRegex) ||
              tryParseJson(val),
            {
              message:
                'ABI must be a valid JSON ABI string or artifact name, see more here: https://docs.soliditylang.org/en/latest/abi-spec.html#json',
            }
          )
          .describe(
            'JSON file of the contract ABI. Required if the target contains an address rather than a contract operation name.'
          ),

        /**
         *  Arguments to use when invoking this call.
         */
        args: z.array(argtype).describe('Arguments to use when invoking this call.'),
        /**
         *  The calling address to use when invoking this call.
         */
        from: z
          .string()
          .refine(
            (val) => isAddress(val) || !!val.match(interpolatedRegex),
            (val) => ({ message: `"${val}" must be a valid ethereum address` })
          )
          .describe('The calling address to use when invoking this call.'),

        /**
         *  Specify a function to use as the 'from' value in a function call. Example `owner()`.
         */
        fromCall: z
          .object({
            /**
             *  The name of a view function to call on this contract. The result will be used as the from input.
             */
            func: z
              .string()
              .describe('The name of a view function to call on this contract. The result will be used as the from input.'),
            /**
             *  The arguments to pass into the function being called.
             */
            args: z.array(argtype).optional().describe('The arguments to pass into the function being called.'),
          })
          .describe("Specify a function to use as the 'from' value in a function call. Example `owner()`."),
        /**
         *  The amount of ether/wei to send in the transaction.
         */
        value: z
          .string()
          .refine((val) => !!val.match(interpolatedRegex) || !!viem.parseEther(val), {
            message: 'Field must be of numeric value',
          })
          .describe('The amount of ether/wei to send in the transaction.'),
        /**
         *   Override transaction settings
         */
        overrides: z
          .object({
            /**
             *   Gas limit to send along with the transaction
             */
            gasLimit: z.string().refine((val) => !!parseInt(val), { message: 'Gas limit is invalid' }),
          })
          .describe('Override transaction settings'),
        /**
         *   Object defined to hold extra transaction result data.
         *   For now its limited to getting event data so it can be reused in other operations
         */
        var: invokeVarRecord,
        extra: invokeVarRecord.describe(
          '⚠ Deprecated in favor of var. Object defined to hold transaction result data in a setting. For now its limited to getting event data so it can be reused in other operations. Use `var` instead.'
        ),
        /**
         *   Object defined to hold deployment transaction result data.
         *   For now its limited to getting deployment event data so it can be reused in other operations
         */
        factory: z
          .record(
            z.object({
              /**
               *   Name of the event to get data for
               */
              event: z.string().describe('Name of the event to get data for'),
              /**
               *   Data argument of the event output
               */
              arg: z.number().int().describe('Data argument of the event output'),

              /**
               *   Number of matching contract events which should be seen by this event (default 1) (set to 0 to make optional)
               */
              expectCount: z
                .number()
                .int()
                .optional()
                .describe(
                  'Number of matching contract events which should be seen by this event (default 1) (set to 0 to make optional)'
                ),

              /**
               *   Name of the contract artifact
               */
              artifact: z
                .string()
                .refine(
                  (val) => !!val.match(artifactNameRegex) || !!val.match(artifactPathRegex),
                  (val) => ({ message: `"${val}" must match a contract artifact name or path` })
                )
                .optional()
                .describe('Name of the contract artifact'),

              /**
               *  An array of contract artifacts that have already been deployed with Cannon.
               *  Used if the code for the deployed contract is not available in the artifacts.
               */
              abiOf: z
                .array(
                  z.string().refine(
                    (val) => !!val.match(artifactNameRegex) || !!val.match(stepRegex),
                    (val) => ({
                      message: `"${val}" must match a previously defined contract operation name or contract artifact name or path`,
                    })
                  )
                )
                .optional()
                .describe(
                  'An array of contract artifacts that have already been deployed with Cannon. Used if the code for the deployed contract is not available in the artifacts.'
                ),

              abi: z
                .string()
                .refine(
                  (val) =>
                    !!val.match(artifactNameRegex) ||
                    !!val.match(jsonAbiPathRegex) ||
                    !!val.match(interpolatedRegex) ||
                    tryParseJson(val),
                  {
                    message:
                      'ABI must be a valid JSON ABI string or artifact name, see more here: https://docs.soliditylang.org/en/latest/abi-spec.html#json',
                  }
                )
                .optional()
                .describe('Abi of the contract being deployed'),

              /**
               *   Constructor or initializer args
               */
              constructorArgs: z.array(argtype).optional().describe('Constructor or initializer args'),

              /**
               *   Bypass error messages if an event is expected in the invoke operation but none are emitted in the transaction.
               */
              allowEmptyEvents: z
                .boolean()
                .optional()
                .describe(
                  'Bypass error messages if an event is expected in the invoke operation but none are emitted in the transaction.'
                ),

              /**
               *    Determines whether contract should get priority in displays
               */
              highlight: z.boolean().optional().describe('Determines whether contract should get priority in displays'),
            })
          )
          .optional()
          .describe(
            'Object defined to hold deployment transaction result data. For now its limited to getting deployment event data so it can be reused in other operations'
          ),
        /**
         *  Previous operations this operation is dependent on
         */
        depends: z
          .array(
            z.string().refine(
              (val) => !!val.match(stepRegex),
              (val) => ({
                message: `"${val}" is invalid. Must reference a previous operation, example: 'contract.Storage'`,
              })
            )
          )
          .describe(
            'List of operations that this operation depends on, which Cannon will execute first. If unspecified, Cannon automatically detects dependencies.'
          ),
      })
      .partial()
  )
  .strict();

export const cloneSchema = z
  .object({
    /**
     *  Name of the package to provision
     */
    source: z
      .string()
      .refine(
        (val) => !!val.match(packageRegex) || !!val.match(interpolatedRegex),
        (val) => ({
          message: `Source value: ${val} must match package formats: "package:version" or "package:version@preset" or be an interpolated value`,
        })
      )
      .refine(
        (val) => {
          const match = val.match(packageRegex);
          if (match) {
            const nameSize = match!.groups!.name.length;

            return nameSize <= 32;
          } else {
            return true;
          }
        },
        (val) => ({ message: `Package reference "${val}" is too long. Package name exceeds 32 bytes` })
      )
      .refine(
        (val) => {
          const match = val.match(packageRegex);

          if (match && match!.groups!.version) {
            const versionSize = match!.groups!.version.length;

            return versionSize <= 32;
          } else {
            return true;
          }
        },
        (val) => ({ message: `Package reference "${val}" is too long. Package version exceeds 32 bytes` })
      )
      .describe('Name of the package to provision'),
  })
  .merge(
    z
      .object({
        /**
         * Description of the operation
         */
        description: z.string().describe('Description of the operation'),
        /**
         *  ID of the chain to import the package from.
         * Default - 13370
         */
        chainId: z.number().int().describe('ID of the chain to import the package from. Default - 13370'),
        /**
         *  (DEPRECATED) Use `source` instead. Override the preset to use when provisioning this package.
         * Default - "main"
         */
        sourcePreset: z
          .string()
          .describe(
            '⚠ Deprecated in favor of appending @PRESET_NAME to source. Override the preset to use when provisioning this package. Default - "main"'
          ),
        /**
         *  Name of the package to write the provisioned package to
         */
        target: z
          .string()
          .refine(
            (val) => !!val.match(packageRegex) || !!val.match(interpolatedRegex),
            (val) => ({
              message: `Target value: ${val} must match package formats: "package:version" or "package:version@preset" or be an interpolated value`,
            })
          )
          .refine(
            (val) => {
              const match = val.match(packageRegex);
              if (match) {
                const nameSize = match!.groups!.name.length;

                return nameSize <= 32;
              } else {
                return true;
              }
            },
            (val) => ({ message: `Package reference "${val}" is too long. Package name exceeds 32 bytes` })
          )
          .refine(
            (val) => {
              const match = val.match(packageRegex);

              if (match && match!.groups!.version) {
                const versionSize = match!.groups!.version.length;

                return versionSize <= 32;
              } else {
                return true;
              }
            },
            (val) => ({ message: `Package reference "${val}" is too long. Package version exceeds 32 bytes` })
          )
          .describe('Name of the package to clone'),
        /**
         *  (DEPRECATED) use `target` instead. Set the new preset to use for this package.
         * Default - "main"
         */
        targetPreset: z
          .string()
          .describe(
            '⚠ Deprecated in favor using target only with format packageName:version@targetPreset. Set the new preset to use for this package. Default - "main"'
          ),
        /**
         *  The settings to be used when initializing this Cannonfile.
         *  Overrides any defaults preset in the source package.
         */
        var: z
          .record(z.string())
          .describe(
            'The settings to be used when initializing this Cannonfile. Overrides any defaults preset in the source package.'
          ),
        /**
         *  (DEPRECATED) use `var`. The settings to be used when initializing this Cannonfile.
         *  Overrides any defaults preset in the source package.
         */
        options: z
          .record(z.string())
          .describe(
            '⚠ Deprecated in favor of var. The settings to be used when initializing this Cannonfile. Overrides any defaults preset in the source package.'
          ),
        /**
         * Additional tags to set on the registry for when this provisioned package is published.
         */
        tags: z
          .array(z.string())
          .describe('Additional tags to set on the registry for when this provisioned package is published.'),
        /**
         *  Previous operations this operation is dependent on
         */
        depends: z
          .array(
            z.string().refine(
              (val) => !!val.match(stepRegex),
              (val) => ({
                message: `"${val}" is invalid. Must reference a previous operation, example: 'contract.Storage'`,
              })
            )
          )
          .describe(
            'List of operations that this operation depends on, which Cannon will execute first. If unspecified, Cannon automatically detects dependencies.'
          ),
      })
      .deepPartial()
  )
  .strict();

export const routerSchema = z
  .object({
    /**
     * Set of contracts that will be passed to the router
     */
    contracts: z.array(z.string()).describe('Set of contracts that will be passed to the router'),
    /**
     * Description of the operation
     */
    description: z.string().optional().describe('Description of the operation'),
    /**
     * Include a `receive` function on the router so that it can receive ETH (or, whatever the gas token is on your network).
     * NOTE: you can always define `payable` functions on your end-functions to receive ETH as well. This is only for receiving ETH like a regular EOA would.
     */
    includeReceive: z.boolean().optional(),
    /**
     * Include additional functions to allow introspection through the EIP-2535 Diamond standard. This will make your router much heavier. By default, diamond compatibility is included.
     */
    includeDiamondCompatibility: z.boolean().optional(),
    /**
     *  Address to pass to the from call
     */
    from: z.string().optional().describe('Address to pass to the from call'),
    /**
     *   Used to force new copy of a contract (not actually used)
     */
    salt: z.string().optional().describe('Used to force new copy of a contract (not actually used)'),
    /**
     *   Override transaction settings
     */
    overrides: z
      .object({
        gasLimit: z.string().optional(),
      })
      .optional()
      .describe('Override transaction settings'),
    /**
     *  List of operations that this operation depends on, which Cannon will execute first. If unspecified, Cannon automatically detects dependencies.
     */
    depends: z
      .array(z.string())
      .optional()
      .describe(
        'List of operations that this operation depends on, which Cannon will execute first. If unspecified, Cannon automatically detects dependencies.'
      ),
    highlight: z.boolean().optional().describe('Determines whether contract should get priority in displays'),
  })
  .strict();

export const diamondSchema = z
  .object({
    /**
     * Set of contracts that will be passed to the router
     */
    contracts: z.array(z.string()).describe('Set of contracts that should be facets of the Diamond proxy'),
    /**
     * Description of the operation
     */
    description: z.string().optional().describe('Description of the action'),
    /**
     *   Used to force new copy of a new diamond proxy
     */
    salt: z.string().describe('Used to force new copy of a contract.'),
    /**
     *   Override transaction settings
     */
    diamondArgs: z.object({
      owner: z.string().describe('Address has permission to change Diamond facets (ie proxied contracts to upgrade)'),
      init: z
        .string()
        .optional()
        .describe('Address to DELEGATECALL on diamondCut() or constructor after the facets have been set'),
      initCalldata: z.string().optional().describe('Additional data to send to the `init` DELEGATECALL'),
    }),
    immutable: z
      .boolean()
      .optional()
      .describe(
        'Prevents the diamond proxy from being modified in the future. Setting this value to `true` is irreversable once deployed.'
      ),
    overrides: z
      .object({
        gasLimit: z.string().optional(),
      })
      .optional()
      .describe('Override transaction settings'),
    /**
     *  List of operations that this operation depends on, which Cannon will execute first. If unspecified, Cannon automatically detects dependencies.
     */
    depends: z
      .array(z.string())
      .optional()
      .describe(
        'List of operations that this operation depends on, which Cannon will execute first. If unspecified, Cannon automatically detects dependencies.'
      ),
    highlight: z.boolean().optional().describe('Determines whether contract should get priority in displays'),
  })
  .strict();

export const varSchema = z
  .object({
    /**
     *   The setting value to apply
     */
    defaultValue: z.string().optional().describe('⚠ Deprecated in favor of var. The value to set in the setting'),
    /**
     * Description of the operation
     */
    description: z.string().optional().describe('Description of the operation'),
    /**
     *  List of operations that this operation depends on, which Cannon will execute first. If unspecified, Cannon automatically detects dependencies.
     */
    depends: z
      .array(z.string())
      .optional()
      .describe(
        'List of operations that this operation depends on, which Cannon will execute first. If unspecified, Cannon automatically detects dependencies.'
      ),
  })
  .catchall(z.string());

/**
 * @internal NOTE: if you edit this schema, please also edit the constructor of ChainDefinition in 'definition.ts' to account for non-operation components
 */
export const chainDefinitionSchema = z
  .object({
    /**
     * Name of the package
     */
    name: z
      .string()
      .min(3)
      .refine(
        (val) => {
          return new Blob([val]).size <= 32;
        },
        (val) => ({ message: `Package name "${val}" is too long. Package name exceeds 32 bytes` })
      )
      .refine((val) => !!val.match(RegExp(/[a-zA-Z0-9-]+/, 'gm')), {
        message: 'Name cannot contain any special characters',
      })
      .describe('Name of the package'),
    /**
     *  Version of the package
     */
    version: z
      .string()
      .refine(
        (val) => {
          return new Blob([val]).size <= 32;
        },
        (val) => ({ message: `Package version "${val}" is too long. Package version exceeds 32 bytes` })
      )
      .refine((val) => !!val.match(RegExp(/[\w.]+/, 'gm')), {
        message: 'Version cannot contain any special characters',
      })
      .describe(
        'Version of the package. Publishes as the "latest" version by default in addition to the version specified here.'
      ),
    /**
     *  Preset of the package
     */
    preset: z
      .string()
      .refine((val) => !!val.match(RegExp(/[\w.]+/, 'gm')), {
        message: 'Preset cannot contain any special characters',
      })
      .refine(
        (val) => {
          return new Blob([val]).size <= 22;
        },
        (val) => ({ message: `Package preset "${val}" is too long. Package preset exceeds 22 bytes` })
      )
      .describe(
        'Preset of the package (Presets are useful for distinguishing multiple deployments of the same protocol on the same chain.) Defaults to "main".'
      )
      .optional(),
    /**
     * Whether or not source code from local package should be bundled in the package.
     * NOTE: If this is set to true, it will not be possible to verify your contracts on etherscan with cannon
     * If not specified, the value is treated as `false` (ie contract source codes included)
     */
    privateSourceCode: z
      .boolean()
      .describe(
        'Turns off inclusion of source code in packages. When set to true, Cannon cannot verify contracts on Etherscan. Defaults to false.'
      )
      .optional(),
    /**
     * Description for the package
     */
    description: z.string().describe('Description for the package').optional(),
    /**
     * Keywords for search indexing
     */
    keywords: z.array(z.string()).describe('Keywords for search indexing').optional(),
    /**
     * Any deployers that could publish this package. Will be used for automatic version management.
     */
    deployers: z
      .array(
        z.string().refine((val) => !!val.match(RegExp(/^0x[a-fA-F0-9]{40}$/, 'gm')), {
          message: 'Invalid Ethereum address',
        })
      )
      .describe('Any deployers that could publish this package. Will be used for automatic version management.')
      .optional(),
  })
  .merge(
    z
      .object({
        /**
         * Object that allows the definition of values for use in next operations
         * ```toml
         *  [settings.owner]
         *  defaultValue: "some-eth-address"
         * ```
         */
        setting: z
          .record(
            z
              .object({
                /**
                 * Description of the operation
                 */
                description: z.string().describe('Description of the operation'),
                /**
                 * Data type of the value being stored
                 */
                type: z.enum(['number', 'string', 'boolean']).describe('Data type of the value being stored'),
                /**
                 * Stored value of the setting
                 */
                defaultValue: z.string().describe('Stored value of the setting'),
              })
              .partial()
          )
          .describe(
            '⚠ Deprecated in favor of var. A setting is a variable that can be set (or overriden using the CLI) when building a Cannonfile. It is accessible elsewhere in the file a property of the settings object. For example, [setting.sampleSetting] can be referenced with <%= settings.sampleSetting %>'
          ),
        /**
         * @internal
         */
        pull: z
          .record(pullSchema)
          .describe(
            'Import a package from the registry. This will make the output of that deployment, such as contract addresses, available to other operations in your Cannonfile. Imported packages must include deployments with chain ID that matches the chain ID of the network you are deploying to.'
          ),
        /**
         * @internal
         */
        import: z
          .record(pullSchema)
          .describe(
            '⚠ Deprecated in favor of pull. Import a package from the registry. This will make the output of that deployment, such as contract addresses, available to other operations in your Cannonfile. Imported packages must include deployments with chain ID that matches the chain ID of the network you are deploying to.'
          ),
        /**
         * @internal
         */
        clone: z
          .record(cloneSchema)
          .describe(
            'Deploy a new instance of a package from the registry. Packages may only be provisioned if they include a local, Cannon deployment (Chain ID: 13370).'
          ),
        /**
         * @internal
         */
        provision: z
          .record(cloneSchema)
          .describe(
            '⚠ Deprecated in favor of clone. Deploy a new instance of a package from the registry. Packages may only be provisioned if they include a local, Cannon deployment (Chain ID: 13370).'
          ),
        /**
         * @internal
         */
        deploy: z.record(deploySchema).describe('Deploy a contract.'),
        /**
         * @internal
         */
        contract: z.record(deploySchema).describe('⚠ Deprecated in favor of deploy. Deploy a contract.'),
        /**
         * @internal
         */
        invoke: z.record(invokeSchema).describe('Call a function.'),
        /**
         * @internal
         */
        router: z
          .record(routerSchema)
          .describe('Generate a contract that proxies calls to multiple contracts using the synthetix router codegen.'),
        /**
         * @internal
         */
        diamond: z
          .record(diamondSchema)
          .describe(
            'Generate a upgradable contract that proxies calls to multiple contracts using a ERC2535 Diamond standard.'
          ),
        /**
         * @internal
         */
        var: z.record(varSchema).describe('Apply a setting or intermediate value.'),
        // ... there may be others that come from plugins
      })
      .deepPartial()
  );
