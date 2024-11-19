import { z } from 'zod';

/// ================================ INPUT CONFIG SCHEMAS ================================ \\\

// Different types that can be passed into the args schema property
const argtype: z.ZodLazy<any> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), argtype), z.array(argtype)]),
);

// Different regular expressions used to validate formats like
// <%=  string interpolation %>, step.names or property.names, packages:versions
const interpolatedRegex = RegExp(/\w*<%= ([^%]*) %>\w*|[^<%=]*<%= [^%]* %>[^<%=]*/, 'i');
const actionNameRegex = RegExp(/^[\w-]+\.[.\w-]+$/, 'i');
const packageRegex = RegExp(
  /^(?<name>@?[a-z0-9][a-z0-9-]{2,31}[a-z0-9])(?::(?<version>[^@]{1,32}))?(@(?<preset>[^\s]{1,26}))?$/,
  'i',
);

// This regex matches artifact names which are just capitalized words like solidity contract names
const artifactNameRegex = RegExp(/^[A-Z]{1}[\w]+$/, 'i');
const artifactPathRegex = RegExp(/^.*\.sol:\w+/, 'i');

const artifactNameOrPathRegex = RegExp(artifactNameRegex.source + '|' + artifactPathRegex.source);

// This regex is stolen from viem isAddress source code
const addressRegex = /^0x[a-fA-F0-9]{40}$/;

const numericRegex = RegExp('[0-9]*|0x[a-fA-F0-9]*|' + interpolatedRegex.source);

// Invoke target string schema
const targetRegex = new RegExp(
  [
    addressRegex.source,
    interpolatedRegex.source,
    actionNameRegex.source,
    artifactNameRegex.source,
    artifactPathRegex.source,
  ].join('|'),
);

// Note: The first schema defined contains required properties, we then merge a schema with the `deepPartial` function which contains the optional properties

const targetSchema = z
  .string()
  .regex(targetRegex)
  .or(z.array(z.string().regex(targetRegex)).nonempty());

export const sharedActionSchema = z
  .object({
    description: z.string().describe('Human-readable description of the operation.'),
    /**
     *  List of operations that this operation depends on, which Cannon will execute first. If unspecified, Cannon automatically detects dependencies.
     */
    depends: z
      .array(z.string().regex(actionNameRegex, 'Must reference another action. Example: `"contract.Storage"`'))
      .describe(
        'List of operations that this operation depends on, which Cannon will execute first. If unspecified, Cannon automatically detects dependencies.',
      ),
    labels: z
      .record(z.string().regex(actionNameRegex, 'Must be lowercase with no special characters'), z.string())
      .describe('Map of keys and values to help identify the outputs of this action'),
  })
  .partial();

export const deploySchema = z
  .object({
    artifact: z
      .string()
      .regex(
        artifactNameOrPathRegex,
        'Must be name of solidity artifact. Example: `MyContract` or `src/MyContract.sol:MyContract`',
      )
      .describe('Artifact name of the target contract'),
  })
  .merge(
    z
      .object({
        highlight: z.boolean().describe('Determines whether contract should get priority in displays'),
        create2: z
          .union([z.boolean(), z.string().regex(addressRegex, 'Must be EVM address')])
          .describe(
            'Determines whether to deploy the contract using create2. If an address is specified, the arachnid create2 contract will be deployed/used from this address.',
          ),
        ifExists: z
          .enum(['continue'])
          .optional()
          .describe(
            'When deploying a contract with CREATE2, determines the behavior when the target contract is already deployed (ex. due to same bytecode and salt). Set to continue to allow the build to continue if the contract is found to have already been deployed. By default, an error is thrown and the action is halted.',
          ),
        from: z
          .string()
          .regex(
            RegExp(addressRegex.source + '|' + interpolatedRegex.source),
            'Must be Ethereum address or interpolated variable reference.',
          )
          .describe('Contract deployer address. Must match the ethereum address format'),
        nonce: z
          .union([z.string().regex(numericRegex, 'Must be numeric or hex quantity'), z.number()])
          .transform((val) => {
            return val.toString();
          })
          .describe(
            'Require for the transaction to be executed at a particular nonce on the signer. If the nonce does not match, an error is thrown.',
          ),
        abi: z.string().describe('String-format JSON of the contract being deployed'),
        abiOf: z
          .array(z.string().regex(artifactNameRegex, 'Must be deployed contract artifact name. Example: `MyContract`'))
          .describe(
            'An array of contract artifacts that have already been deployed with Cannon. This is useful when deploying proxy contracts.',
          ),
        args: z.array(argtype).describe('Constructor or initializer args.'),
        libraries: z
          .record(z.string())
          .describe(
            'An array of addresses this contract depends on as a Solidity library. These contracts will be automatically linked.',
          ),
        salt: z.string().describe('Used to force new copy of a contract.'),
        value: z
          .string()
          .regex(numericRegex, 'Must be a numeric value or interpolated variable reference')
          .describe('Native currency value to send with the contract creation transaction'),
        overrides: z
          .object({
            gasLimit: z
              .string()
              .regex(numericRegex, 'Must be numeric or interpolated value reference')
              .describe(
                'The maximum amount of gas consumed by the transaction. If left unset, the amount of gas required is estimated with the RPC node.',
              ),
            simulate: z.boolean().describe('Do not use. Only used internally.'),
          })
          .partial()
          .describe('Override transaction settings.'),
      })
      .partial(),
  )
  .strict()
  .merge(sharedActionSchema);

export const pullSchema = z
  .object({
    source: z
      .string()
      .regex(
        RegExp(packageRegex.source + '|' + actionNameRegex + '|' + interpolatedRegex),
        'Must be package name or interpolated value reference',
      )
      .describe('Source of the cannonfile package to import from. Can be a cannonfile operation name or package name.'),
  })
  .merge(
    z
      .object({
        chainId: z.number().int().describe('ID of the chain to import the package from.'),
        preset: z.string().describe('Preset label of the package being imported.'),
      })
      .partial(),
  )
  .strict()
  .merge(sharedActionSchema);

const invokeVarRecord = z
  .record(
    z
      .object({
        event: z.string().describe('Name of the event to retrieve data from.'),
        arg: z.number().int().describe('Within the given `event`, which event argument contains the data to import.'),
        expectCount: z
          .number()
          .int()
          .optional()
          .describe(
            'Number of matching contract events which should be seen by this event (default 1) (set to 0 to make optional).',
          ),
        allowEmptyEvents: z
          .boolean()
          .optional()
          .describe(
            'Bypass errors if an event is expected in the invoke operation but none are emitted in the transaction.',
          ),
      })
      .strict(),
  )
  .describe(
    'Object defined to hold transaction result data in a setting. For now its limited to getting event data so it can be reused in other operations.',
  );

export const invokeSchema = z
  .object({
    target: targetSchema.describe('Names of the contract to call or contract operation that deployed the contract to call.'),
    func: z.string().describe('Name of the function to call on the contract.'),
  })
  .merge(
    z
      .object({
        abi: z
          .string()
          .describe(
            'String-encoded JSON of the contract ABI. Required if the target contains an address rather than a contract operation name.',
          ),
        args: z
          .array(argtype)
          .describe(
            'Arguments to use when invoking this call. Must match the number of arguments expected when calling the EVM function. Can be omitted if no arguments are required.',
          ),
        from: z
          .string()
          .regex(
            RegExp(addressRegex.source + '|' + interpolatedRegex.source),
            'Must be Ethereum address or interpolated variable reference.',
          )
          .describe('The calling address to use when invoking this call.'),
        fromCall: z
          .object({
            func: z
              .string()
              .describe('The name of a view function to call on this contract. The result will be used as the from input.'),
            args: z.array(argtype).optional().describe('The arguments to pass into the function being called.'),
          })
          .describe("Specify a function to use as the 'from' value in a function call. Example `owner()`."),
        value: z
          .string()
          .regex(numericRegex, 'Must be numeric or interpolated value reference')
          .describe('The amount of ether/wei to send with the transaction.'),
        overrides: z
          .object({
            /**
             *   Gas limit to send along with the transaction
             */
            gasLimit: z
              .string()
              .regex(numericRegex, 'Must be numeric or interpolated value reference')
              .describe(
                'The maximum amount of gas that can be consumed by the transaction. If unset, defaults to the estimated gas limit.',
              ),
          })
          .partial()
          .describe('Override transaction settings.'),
        var: invokeVarRecord,
        extra: invokeVarRecord.describe(
          '⚠ Deprecated in favor of var. Object defined to hold transaction result data in a setting. For now its limited to getting event data so it can be reused in other operations. Use `var` instead.',
        ),
        factory: z
          .record(
            z.object({
              event: z.string().describe('Name of the event containing the deployed contract address.'),
              arg: z.number().int().describe('Index of the event containing the deployed contract address.'),
              expectCount: z
                .number()
                .int()
                .optional()
                .describe(
                  'Number of matching contract events which should be seen by this event (default 1) (set to 0 to make optional).',
                ),
              artifact: z
                .string()
                .regex(artifactNameOrPathRegex, 'Must a contract artifact name or path.')
                .optional()
                .describe('Name of the contract artifact.'),
              abiOf: z
                .array(z.string().regex(artifactNameRegex, 'Must be a deployed contract name.'))
                .optional()
                .describe(
                  'An array of contract artifacts that have already been deployed with Cannon. Used if the code for the deployed contract is not available in the artifacts.',
                ),

              abi: z
                .string()
                .optional()
                .describe(
                  'String-formatted ABI of the deployed contract. Will be stored in the generated contract artifact.',
                ),
              constructorArgs: z
                .array(argtype)
                .optional()
                .describe('Arguments passed to the constructor. Required for block explorer verification.'),
              allowEmptyEvents: z
                .boolean()
                .optional()
                .describe(
                  'Bypass error messages if an event is expected in the invoke operation but none are emitted in the transaction.',
                ),
              highlight: z
                .boolean()
                .optional()
                .describe('DEPRECATED. Determines whether contract should get priority in displays'),
            }),
          )
          .optional()
          .describe(
            'Object defined to hold deployment transaction result data. For now its limited to getting deployment event data so it can be reused in other operations',
          ),
      })
      .partial(),
  )
  .strict()
  .merge(sharedActionSchema);

export const cloneSchema = z
  .object({
    source: z
      .string()
      .regex(RegExp(packageRegex.source + '|' + interpolatedRegex), 'Must be package name or interpolated value reference')
      .describe('Source of the cannonfile package to clone from. Can be a cannonfile operation name or package name.'),
  })
  .merge(
    z
      .object({
        description: z.string().describe('Description of the operation.'),
        chainId: z.number().int().describe('ID of the chain to import the package from. Default - 13370.'),
        sourcePreset: z
          .string()
          .describe(
            '⚠ DEPRECATED. Append @PRESET_NAME to `source` instead. Override the preset to use when provisioning this package. Default - "main"',
          ),
        target: z
          .string()
          .regex(
            RegExp(packageRegex.source + '|' + interpolatedRegex.source),
            `Must be cannon package format: "package:version" or "package:version@preset" or be an interpolated value. Additionally, package name, version, and preset can't be longer than normal.`,
          )
          .describe('Name of the package to write the cloned resulting package to.'),
        targetPreset: z
          .string()
          .describe(
            '⚠ DEPRECATED. Use `target` only with format `packageName:version@targetPreset`. Set the new preset to use for this package. Default - `main`',
          ),
        var: z
          .record(z.string())
          .describe(
            'The settings to be used when initializing this Cannonfile. Overrides any defaults preset in the source package.',
          ),
        options: z
          .record(z.string())
          .describe(
            '⚠ DEPRECATED. Use `var` instead. The settings to be used when initializing this Cannonfile. Overrides any defaults preset in the source package.',
          ),
        tags: z
          .array(z.string())
          .describe('Additional tags to set on the registry for when this provisioned package is published.'),
      })
      .partial(),
  )
  .strict()
  .merge(sharedActionSchema);

export const routerSchema = z
  .object({
    contracts: z.array(z.string()).describe('Set of contracts that the router will be able to resolve.'),
    includeReceive: z
      .boolean()
      .describe(
        'Include a `receive` function on the router so that it can receive ETH (or whatever the gas token is on your network).\nNOTE: even if field is not enabled, your routed functions can still receive ETH. This only affects the behavior of the router receiving ETH without any data/a function call.',
      )
      .optional(),
    from: z.string().optional().describe('Address to pass to the from call.'),
    salt: z.string().optional().describe('Used to force new copy of a contract.'),
    overrides: z
      .object({
        gasLimit: z
          .string()
          .regex(numericRegex, 'Must be numeric or interpolated value reference')
          .optional()
          .describe(
            'The maximum amount of gas that can be spent when executing this transaction. If unset, the gas limit will be automatically computed with eth_estimateTransactionGas call on the RPC node.',
          ),
      })
      .optional()
      .describe('Override transaction settings.'),
    highlight: z.boolean().optional().describe('Determines whether contract should get priority in displays.'),
  })
  .strict()
  .merge(sharedActionSchema);

export const diamondSchema = z
  .object({
    contracts: z.array(z.string()).describe('Set of contracts that should be facets of the Diamond proxy.'),
    salt: z.string().describe('Used to force deployment of a new copy of a contract.'),
    diamondArgs: z.object({
      owner: z.string().describe('Address that has permission to change Diamond facets (ie proxied contracts to upgrade).'),
      init: z
        .string()
        .optional()
        .describe('Address to DELEGATECALL on diamondCut() or constructor after the facets have been set.'),
      initCalldata: z.string().optional().describe('Additional data to send to the `init` DELEGATECALL'),
    }),
    immutable: z
      .boolean()
      .optional()
      .describe(
        'Prevents the diamond proxy from being modified in the future. Setting this value to `true` is irreversable once deployed.',
      ),
    overrides: z
      .object({
        gasLimit: z
          .string()
          .regex(numericRegex, 'Must be numeric or interpolated value reference')
          .optional()
          .describe(
            'The maximum amount of gas that can be spent when executing this transaction. If unset, the gas limit will be automatically computed with eth_estimateTransactionGas call on the RPC node.',
          ),
      })
      .optional()
      .describe('Override transaction settings.'),
    highlight: z.boolean().optional().describe('Determines whether contract should get priority in displays'),
  })
  .strict()
  .merge(sharedActionSchema);

export const varSchema = z.object({}).catchall(z.string());

/**
 * @internal NOTE: if you edit this schema, please also edit the constructor of ChainDefinition in 'definition.ts' to account for non-operation components
 */
export const chainDefinitionSchema = z
  .object({
    name: z
      .string()
      .regex(
        RegExp(/^[a-z0-9-]{3,32}$/, 'gm'),
        'Name cannot contain any special characters and must be between 3 and 32 characters long',
      )
      .describe('Name of the package on the registry.'),
    version: z
      .string()
      .regex(RegExp(/^[\w.]{1,32}$/, 'gm'), 'Version must be between 1 and 32 characters long')
      .describe(
        'Version of the package. Publishes as the "latest" version by default in addition to the version specified here. This value is only intended for human consumption, and does not have any effect on version tracking inside of Cannon.',
      ),
    preset: z
      .string()
      .regex(RegExp(/^[\w.]{1,26}$/, 'gm'), 'Preset must be between 1 and 26 characters long')
      .describe(
        'Preset of the package (Presets are useful for distinguishing multiple deployments of the same protocol on the same chain.) Defaults to "main".',
      )
      .optional(),
    privateSourceCode: z
      .boolean()
      .describe(
        'Turns off inclusion of source code in packages. When set to true, Cannon cannot verify contracts on a block explorer, and your source code is hidden. Defaults to false.',
      )
      .optional(),
    description: z.string().describe('Human-readable short explanation about the package.').optional(),
    keywords: z.array(z.string()).describe('Keywords for registry search indexing.').optional(),
    deployers: z
      .array(z.string().regex(addressRegex, 'Must be an EVM address'))
      .describe(
        'Any deployers that could publish this package. Used *only* to automatically detect previous deployed package for version management.',
      )
      .optional(),
    include: z.array(z.string()).describe('Array of additional files to load into the cannon deployment state.').optional(),
  })
  .merge(
    z
      .object({
        setting: z
          .record(
            z
              .object({
                type: z.enum(['number', 'string', 'boolean']).describe('Data type of the value being stored'),
                defaultValue: z.string().describe('Stored value of the setting'),
              })
              .partial()
              .merge(sharedActionSchema),
          )
          .describe(
            '⚠ DEPRECATED. Use `var` instead. A setting is a variable that can be set (or overriden using the CLI) when building a Cannonfile. It is accessible elsewhere in the file a property of the settings object. For example, [setting.sampleSetting] can be referenced with <%= settings.sampleSetting %>',
          ),
        pull: z
          .record(pullSchema)
          .describe(
            'Import a package from the registry. This will make the output of that deployment, such as contract addresses, available to other operations in your Cannonfile. Imported packages must include deployments with chain ID that matches the chain ID of the network you are deploying to.',
          ),
        import: z
          .record(pullSchema)
          .describe(
            '⚠ DEPRECATED. Use `pull` instead. Import a package from the registry. This will make the output of that deployment, such as contract addresses, available to other operations in your Cannonfile. Imported packages must include deployments with chain ID that matches the chain ID of the network you are deploying to.',
          ),
        clone: z
          .record(cloneSchema)
          .describe(
            'Deploy a new instance of a package from the registry. Packages may only be provisioned if they include a local, Cannon deployment (Chain ID: 13370).',
          ),
        provision: z
          .record(cloneSchema)
          .describe(
            '⚠ DEPRECATED. Use `clone` instead. Deploy a new instance of a package from the registry. Packages may only be provisioned if they include a local, Cannon deployment (Chain ID: 13370).',
          ),
        deploy: z.record(deploySchema).describe('Deploy a contract.'),
        contract: z.record(deploySchema).describe('⚠ Deprecated in favor of deploy. Deploy a contract.'),
        invoke: z.record(invokeSchema).describe('Call a function.'),
        router: z
          .record(routerSchema)
          .describe('Generate a contract that proxies calls to multiple contracts using the synthetix router codegen.'),
        diamond: z
          .record(diamondSchema)
          .describe(
            'Generate a upgradable contract that proxies calls to multiple contracts using a ERC2535 Diamond standard.',
          ),
        var: z.record(varSchema).describe('Apply a setting or intermediate value.'),
        // ... there may be others that come from plugins
      })
      .partial(),
  );
