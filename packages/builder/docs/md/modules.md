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

[packages/builder/src/schemas.zod.ts:235](https://github.com/usecannon/cannon/blob/f25c70c9/packages/builder/src/schemas.zod.ts#L235)

___

### ImportConfig

Ƭ **ImportConfig**: `Object`

Available properties for import step

**`Alias`**

Import

#### Type declaration

| Name | Type |
| :------ | :------ |
| `source` | `string` |
| `chainId?` | `number` |
| `preset?` | `string` |
| `depends?` | `string`[] |

#### Defined in

[packages/builder/src/schemas.zod.ts:242](https://github.com/usecannon/cannon/blob/f25c70c9/packages/builder/src/schemas.zod.ts#L242)

___

### InvokeConfig

Ƭ **InvokeConfig**: `Object`

Available properties for invoke step

**`Alias`**

Invoke

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

[packages/builder/src/schemas.zod.ts:249](https://github.com/usecannon/cannon/blob/f25c70c9/packages/builder/src/schemas.zod.ts#L249)

___

### ProvisionConfig

Ƭ **ProvisionConfig**: `Object`

Available properties for provision step

**`Alias`**

Provision

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

[packages/builder/src/schemas.zod.ts:256](https://github.com/usecannon/cannon/blob/f25c70c9/packages/builder/src/schemas.zod.ts#L256)

___

### RunConfig

Ƭ **RunConfig**: `Object`

Available properties for run step

**`Alias`**

Run

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

[packages/builder/src/schemas.zod.ts:263](https://github.com/usecannon/cannon/blob/f25c70c9/packages/builder/src/schemas.zod.ts#L263)

___

### ChainDefinitionScriptConfig

Ƭ **ChainDefinitionScriptConfig**: `Object`

Available properties for keeper step

**`Alias`**

Keeper

#### Type declaration

| Name | Type |
| :------ | :------ |
| `exec` | `string` |
| `args?` | `string`[] |
| `env?` | `string`[] |

#### Defined in

[packages/builder/src/schemas.zod.ts:270](https://github.com/usecannon/cannon/blob/f25c70c9/packages/builder/src/schemas.zod.ts#L270)

___

### ChainDefinitionConfig

Ƭ **ChainDefinitionConfig**: `Object`

Available properties for top level config

**`Alias`**

CannonfileConfig

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

[packages/builder/src/schemas.zod.ts:277](https://github.com/usecannon/cannon/blob/f25c70c9/packages/builder/src/schemas.zod.ts#L277)
