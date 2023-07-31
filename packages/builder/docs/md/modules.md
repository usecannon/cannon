[@usecannon/builder](README.md) / Exports

# @usecannon/builder

## Table of contents

### Type Aliases

- [Contract](modules.md#contract)
- [Import](modules.md#import)
- [Invoke](modules.md#invoke)
- [Provision](modules.md#provision)
- [Run](modules.md#run)
- [Keeper](modules.md#keeper)
- [ChainDefinition](modules.md#chaindefinition)

## Type Aliases

### Contract

Ƭ **Contract**: `Object`

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

[packages/builder/src/schemas.zod.ts:243](https://github.com/usecannon/cannon/blob/45367c1f/packages/builder/src/schemas.zod.ts#L243)

___

### Import

Ƭ **Import**: `Object`

Available properties for import step

#### Type declaration

| Name | Type |
| :------ | :------ |
| `source` | `string` |
| `chainId?` | `number` |
| `preset?` | `string` |
| `depends?` | `string`[] |

#### Defined in

[packages/builder/src/schemas.zod.ts:249](https://github.com/usecannon/cannon/blob/45367c1f/packages/builder/src/schemas.zod.ts#L249)

___

### Invoke

Ƭ **Invoke**: `Object`

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

[packages/builder/src/schemas.zod.ts:255](https://github.com/usecannon/cannon/blob/45367c1f/packages/builder/src/schemas.zod.ts#L255)

___

### Provision

Ƭ **Provision**: `Object`

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

[packages/builder/src/schemas.zod.ts:261](https://github.com/usecannon/cannon/blob/45367c1f/packages/builder/src/schemas.zod.ts#L261)

___

### Run

Ƭ **Run**: `Object`

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

[packages/builder/src/schemas.zod.ts:267](https://github.com/usecannon/cannon/blob/45367c1f/packages/builder/src/schemas.zod.ts#L267)

___

### Keeper

Ƭ **Keeper**: `Object`

Available properties for keeper step

#### Type declaration

| Name | Type |
| :------ | :------ |
| `exec` | `string` |
| `args?` | `string`[] |
| `env?` | `string`[] |

#### Defined in

[packages/builder/src/schemas.zod.ts:273](https://github.com/usecannon/cannon/blob/45367c1f/packages/builder/src/schemas.zod.ts#L273)

___

### ChainDefinition

Ƭ **ChainDefinition**: `Object`

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

[packages/builder/src/schemas.zod.ts:279](https://github.com/usecannon/cannon/blob/45367c1f/packages/builder/src/schemas.zod.ts#L279)
