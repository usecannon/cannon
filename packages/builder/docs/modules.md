[@usecannon/builder](README.md) / Exports

# @usecannon/builder

## Table of contents

### Type Aliases

- [ContractConfig](modules.md#contractconfig)
- [ImportConfig](modules.md#importconfig)
- [InvokeConfig](modules.md#invokeconfig)
- [ProvisionConfig](modules.md#provisionconfig)
- [RunConfig](modules.md#runconfig)
- [ChainDefinitionScriptConfig](modules.md#chaindefinitionscriptconfig)
- [ChainDefinitionConfig](modules.md#chaindefinitionconfig)

## Type Aliases

### ContractConfig

Ƭ **ContractConfig**: `Object`

Available properties for contract step

#### Type declaration

| Name | Type |
| :------ | :------ |
| `artifact` | `string` |
| `create2?` | `boolean` |
| `from?` | `string` |
| `nonce?` | `string` |
| `abi?` | `string` |
| `abiOf?` | `string`[] |
| `args?` | `any`[] |
| `libraries?` | `Record`<`string`, `string`\> |
| `salt?` | `string` |
| `value?` | `string` |
| `overrides?` | { gasLimit?: string \| undefined; } |
| `depends?` | `string`[] |

#### Defined in

packages/builder/src/schemas.zod.ts:234

___

### ImportConfig

Ƭ **ImportConfig**: `Object`

Available properties for import step

#### Type declaration

| Name | Type |
| :------ | :------ |
| `source` | `string` |
| `chainId?` | `number` |
| `preset?` | `string` |
| `depends?` | `string`[] |

#### Defined in

packages/builder/src/schemas.zod.ts:240

___

### InvokeConfig

Ƭ **InvokeConfig**: `Object`

Available properties for invoke step

#### Type declaration

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

#### Defined in

packages/builder/src/schemas.zod.ts:246

___

### ProvisionConfig

Ƭ **ProvisionConfig**: `Object`

Available properties for provision step

#### Type declaration

| Name | Type |
| :------ | :------ |
| `source` | `string` |
| `chainId?` | `number` |
| `sourcePreset?` | `string` |
| `targetPreset?` | `string` |
| `options?` | `Record`<`string`, `string`\> |
| `tags?` | `string`[] |
| `depends?` | `string`[] |

#### Defined in

packages/builder/src/schemas.zod.ts:252

___

### RunConfig

Ƭ **RunConfig**: `Object`

Available properties for run step

#### Type declaration

| Name | Type |
| :------ | :------ |
| `func` | `string` |
| `exec` | `string` |
| `modified` | [`string`, ...string[]] |
| `args?` | `string`[] |
| `env?` | `string`[] |
| `depends?` | `string`[] |

#### Defined in

packages/builder/src/schemas.zod.ts:258

___

### ChainDefinitionScriptConfig

Ƭ **ChainDefinitionScriptConfig**: `Object`

Available properties for keeper step

#### Type declaration

| Name | Type |
| :------ | :------ |
| `exec` | `string` |
| `args?` | `string`[] |
| `env?` | `string`[] |

#### Defined in

packages/builder/src/schemas.zod.ts:264

___

### ChainDefinitionConfig

Ƭ **ChainDefinitionConfig**: `Object`

Available properties for top level config

#### Type declaration

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `version` | `string` |
| `description?` | `string` |
| `keywords?` | `string`[] |
| `setting?` | `Record`<`string`, { description?: string \| undefined; type?: "string" \| "number" \| "boolean" \| undefined; defaultValue?: string \| undefined; }\> |
| `import?` | { importSchema?: { source?: string \| undefined; chainId?: number \| undefined; preset?: string \| undefined; depends?: string[] \| undefined; } \| undefined; } |

#### Defined in

packages/builder/src/schemas.zod.ts:270
