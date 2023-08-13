# Actions


<a name="actionscore-actionsmd"></a>

## @usecannon/builder

### Base Cannonfile Config

#### RawChainDefinition

Ƭ **RawChainDefinition**: `objectOutputType`<{ `name`: `ZodEffects`<`ZodString`, `string`, `string`\> ; `version`: `ZodEffects`<`ZodString`, `string`, `string`\> ; `description`: `ZodOptional`<`ZodString`\> ; `keywords`: `ZodOptional`<`ZodArray`<`ZodString`, ``"many"``\>\> ; `setting`: `ZodOptional`<`ZodRecord`<`ZodString`, `ZodObject`<{ `description`: `ZodOptional`<`ZodString`\> ; `type`: `ZodOptional`<`ZodEnum`<[``"number"``, ``"string"``, ``"boolean"``]\>\> ; `defaultValue`: `ZodOptional`<`ZodString`\>  }, ``"strip"``, `ZodTypeAny`, { description?: string \| undefined; type?: "string" \| "number" \| "boolean" \| undefined; defaultValue?: string \| undefined; }, { description?: string \| undefined; type?: "string" \| "number" \| "boolean" \| undefined; defaultValue?: string \| undefined; }\>\>\>  }, `ZodAny`, ``"strip"``\>

Available properties for top level config

##### Defined in

[packages/builder/src/actions.ts:54](https://github.com/usecannon/cannon/blob/4e275be6/packages/builder/src/actions.ts#L54)

### Contract

#### Config

Ƭ **Config**: `Object`

Available properties for contract step

##### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `artifact` | `string` | Artifact name of the target contract |
| `create2?` | `boolean` | Determines whether to deploy the contract using create2 |
| `from?` | `string` | Contract deployer address. Must match the ethereum address format |
| `nonce?` | `string` | - |
| `abi?` | `string` | Abi of the contract being deployed |
| `abiOf?` | `string`[] | An array of contract artifacts that you've already deployed with Cannon. This is useful when deploying proxy contracts. |
| `args?` | (`string` \| `number` \| (`string` \| `number`)[] \| `Record`<`string`, `string` \| `number`\>)[] | Constructor args |
| `libraries?` | `Record`<`string`, `string`\> | An array of contract action names that deploy libraries this contract depends on. |
| `salt?` | `string` | Used to force new copy of a contract (not actually used) |
| `value?` | `string` | Native currency value to into the deploy transaction |
| `overrides?` | { gasLimit?: string \| undefined; } | Override transaction settings |
| `depends?` | `string`[] | List of steps that this action depends on |

##### Defined in

[packages/builder/src/steps/contract.ts:29](https://github.com/usecannon/cannon/blob/4e275be6/packages/builder/src/steps/contract.ts#L29)

### Import

#### Config

Ƭ **Config**: `Object`

Available properties for import step

##### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `source` | `string` | Source of the cannonfile package to import from |
| `chainId?` | `number` | ID of the chain to import the package from |
| `preset?` | `string` | Preset label of the package being imported |
| `depends?` | `string`[] | Previous steps this step is dependent on |

##### Defined in

[packages/builder/src/steps/import.ts:19](https://github.com/usecannon/cannon/blob/4e275be6/packages/builder/src/steps/import.ts#L19)

### Invoke

#### Config

Ƭ **Config**: `Object`

Available properties for invoke step

##### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `target` | [`string`, ...string[]] | Name of the contract action that deployed the contract to call |
| `func` | `string` | Name of the function to call on the contract |
| `abi?` | `string` | JSON file of the contract ABI Required if the target contains an address rather than a contract action name. |
| `args?` | (`string` \| `number` \| (`string` \| `number`)[] \| `Record`<`string`, `string` \| `number`\>)[] | Arguments to use when invoking this call. |
| `from?` | `string` | The calling address to use when invoking this call. |
| `fromCall?` | { `func`: `string` ; `args?`: `string`[]  } | - |
| `fromCall.func` | `string` | The name of a view function to call on this contract. The result will be used as the from input. |
| `fromCall.args?` | `string`[] | The arguments to pass into the function above. |
| `value?` | `string` | The amount of ether/wei to send in the transaction. |
| `overrides?` | { `gasLimit`: `string`  } | Override transaction settings |
| `overrides.gasLimit` | `string` | - |
| `extra?` | `Record`<`string`, { `event`: `string` ; `arg`: `number` ; `allowEmptyEvents?`: `boolean`  }\> | Object defined to hold extra transaction result data. For now its limited to getting event data so it can be reused in other steps |
| `factory?` | `Record`<`string`, { `event`: `string` ; `arg`: `number` ; `artifact?`: `string` ; `abiOf?`: `string`[] ; `constructorArgs?`: `any`[] ; `allowEmptyEvents?`: `boolean`  }\> | Object defined to hold deployment transaction result data. For now its limited to getting event data so it can be reused in other steps |
| `depends?` | `string`[] | Previous steps this step is dependent on |

##### Defined in

[packages/builder/src/steps/invoke.ts:27](https://github.com/usecannon/cannon/blob/4e275be6/packages/builder/src/steps/invoke.ts#L27)

### Provision

#### Config

Ƭ **Config**: `Object`

Available properties for provision step

##### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `source` | `string` | Name of the package to provision |
| `chainId?` | `number` | ID of the chain to import the package from **`Default`** ```ts - 13370 ``` |
| `sourcePreset?` | `string` | Override the preset to use when provisioning this package. **`Default`** ```ts - "main" ``` |
| `targetPreset?` | `string` | Set the new preset to use for this package. **`Default`** ```ts - "main" ``` |
| `options?` | `Record`<`string`, `string`\> | The settings to be used when initializing this Cannonfile. Overrides any defaults preset in the source package. |
| `tags?` | `string`[] | Additional tags to set on the registry for when this provisioned package is published. |
| `depends?` | `string`[] | Previous steps this step is dependent on |

##### Defined in

[packages/builder/src/steps/provision.ts:26](https://github.com/usecannon/cannon/blob/4e275be6/packages/builder/src/steps/provision.ts#L26)


<a name="actionscustom-actionsmd"></a>

## @usecannon/cli

### Run

#### Config

Ƭ **Config**: `Object`

Available properties for run step

##### Type declaration

| Name | Type |
| :------ | :------ |
| `exec` | `string` |
| `func` | `string` |
| `modified` | [`string`, ...string[]] |
| `args?` | `string`[] |
| `env?` | `string`[] |
| `depends?` | `string`[] |

##### Defined in

[packages/cli/src/custom-steps/run.ts:70](https://github.com/usecannon/cannon/blob/4e275be6/packages/cli/src/custom-steps/run.ts#L70)
