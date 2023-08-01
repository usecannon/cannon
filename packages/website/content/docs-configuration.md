# Actions


<a name="actionscore-actionsmd"></a>

### Base Cannonfile Config

#### RawChainDefinition

Ƭ **RawChainDefinition**: `Object`

Available properties for top level config

##### Type declaration

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `version` | `string` |
| `description?` | `string` |
| `keywords?` | `string`[] |
| `setting?` | `Record`<`string`, { description?: string \| undefined; type?: "string" \| "number" \| "boolean" \| undefined; defaultValue?: string \| undefined; }\> |
| `import?` | { `label`: `string` = 'import'; `validate`: `ZodObject`<{ source: ZodString; chainId: ZodOptional<ZodNumber\>; preset: ZodOptional<ZodString\>; depends: ZodOptional<ZodArray<ZodString, "many"\>\>; }, ``"strip"``, `ZodTypeAny`, { source: string; chainId?: number \| undefined; preset?: string \| undefined; depends?: string[] \| undefined; }, { source: string; chainId?: number \| undefined; preset?: string \| undefined; depends?: string[] \| undefined; }\> = importSchema; `getState`: (`runtime`: `ChainBuilderRuntime`, `ctx`: `ChainBuilderContextWithHelpers`, `config`: { source: string; chainId?: number \| undefined; preset?: string \| undefined; depends?: string[] \| undefined; }) => `Promise`<{ `url`: ``null`` \| `string`  }\> ; `configInject`: (`ctx`: `ChainBuilderContextWithHelpers`, `config`: { source: string; chainId?: number \| undefined; preset?: string \| undefined; depends?: string[] \| undefined; }) => { source: string; chainId?: number \| undefined; preset?: string \| undefined; depends?: string[] \| undefined; } ; `exec`: (`runtime`: `ChainBuilderRuntime`, `ctx`: `ChainBuilderContext`, `config`: { source: string; chainId?: number \| undefined; preset?: string \| undefined; depends?: string[] \| undefined; }, `packageState`: `PackageState`) => `Promise`<`Partial`<`Pick`<`ChainBuilderContext`, ``"imports"`` \| ``"contracts"`` \| ``"txns"`` \| ``"extras"``\>\>\>  } |
| `import.label` | `string` |
| `import.validate` | `ZodObject`<{ source: ZodString; chainId: ZodOptional<ZodNumber\>; preset: ZodOptional<ZodString\>; depends: ZodOptional<ZodArray<ZodString, "many"\>\>; }, ``"strip"``, `ZodTypeAny`, { source: string; chainId?: number \| undefined; preset?: string \| undefined; depends?: string[] \| undefined; }, { source: string; chainId?: number \| undefined; preset?: string \| undefined; depends?: string[] \| undefined; }\> |
| `import.getState` | [object Object] |
| `import.configInject` | [object Object] |
| `import.exec` | [object Object] |

##### Defined in

[packages/builder/src/actions.ts:53](https://github.com/usecannon/cannon/blob/fb1a78b2/packages/builder/src/actions.ts#L53)

### Contract

#### Config

Ƭ **Config**: `Object`

Available properties for contract step

##### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `artifact` | `string` | Artifact name of the target contract **`Example`** * ```toml * [contract.synthetix] artifact = "Synthetix" ... * ``` |
| `create2?` | `boolean` | Determines whether to deploy the contract using create2 |
| `from?` | `string` | Contract deployer address |
| `nonce?` | `string` | - |
| `abi?` | `string` | Abi of the contract being deployed |
| `abiOf?` | `string`[] | - |
| `args?` | `any`[] | Constructor args |
| `libraries?` | `Record`<`string`, `string`\> | Object containing list of libraries |
| `salt?` | `string` | Used to force new copy of a contract (not actually used) |
| `value?` | `string` | Native currency value to into the deploy transaction |
| `overrides?` | { gasLimit?: string \| undefined; } | Override settings for deployment |
| `depends?` | `string`[] | List of steps that this action depends on |

##### Defined in

[packages/builder/src/steps/contract.ts:30](https://github.com/usecannon/cannon/blob/fb1a78b2/packages/builder/src/steps/contract.ts#L30)

### Import

#### Config

Ƭ **Config**: `Object`

Available properties for import step

##### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `source` | `string` | Source of the cannonfile package to import from **`Example`** ```toml [import.synthetix-sandbox] source = "synthetix-sandbox" ... ``` |
| `chainId?` | `number` | - |
| `preset?` | `string` | - |
| `depends?` | `string`[] | - |

##### Defined in

[packages/builder/src/steps/import.ts:20](https://github.com/usecannon/cannon/blob/fb1a78b2/packages/builder/src/steps/import.ts#L20)

### Invoke

#### Config

Ƭ **Config**: `Object`

Available properties for invoke step

##### Type declaration

| Name | Type |
| :------ | :------ |
| `target` | [`string`, ...string[]] |
| `func` | `string` |
| `abi?` | `string` |
| `args?` | `any`[] |
| `from?` | `string` |
| `fromCall?` | { func?: string \| undefined; args?: any[] \| undefined; } |
| `value?` | `string` |
| `overrides?` | { gasLimit?: string \| undefined; } |
| `extra?` | `Record`<`string`, { `event`: `string` ; `arg`: `number` ; `allowEmptyEvents?`: `boolean`  }\> |
| `factory?` | `Record`<`string`, { `event`: `string` ; `arg`: `number` ; `artifact?`: `string` ; `abiOf?`: `string`[] ; `constructorArgs?`: `any`[] ; `allowEmptyEvents?`: `boolean`  }\> |
| `depends?` | `string`[] |

##### Defined in

[packages/builder/src/steps/invoke.ts:28](https://github.com/usecannon/cannon/blob/fb1a78b2/packages/builder/src/steps/invoke.ts#L28)

### Keeper

#### Config

Ƭ **Config**: `Object`

Available properties for keeper step

##### Type declaration

| Name | Type |
| :------ | :------ |
| `exec` | `string` |
| `args?` | `string`[] |
| `env?` | `string`[] |

##### Defined in

[packages/builder/src/steps/keeper.ts:14](https://github.com/usecannon/cannon/blob/fb1a78b2/packages/builder/src/steps/keeper.ts#L14)

### Provision

#### Config

Ƭ **Config**: `Object`

Available properties for provision step

##### Type declaration

| Name | Type |
| :------ | :------ |
| `source` | `string` |
| `chainId?` | `number` |
| `sourcePreset?` | `string` |
| `targetPreset?` | `string` |
| `options?` | `Record`<`string`, `string`\> |
| `tags?` | `string`[] |
| `depends?` | `string`[] |

##### Defined in

[packages/builder/src/steps/provision.ts:27](https://github.com/usecannon/cannon/blob/fb1a78b2/packages/builder/src/steps/provision.ts#L27)


<a name="actionscustom-actionsmd"></a>

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

[packages/cli/src/custom-steps/run.ts:70](https://github.com/usecannon/cannon/blob/fb1a78b2/packages/cli/src/custom-steps/run.ts#L70)
