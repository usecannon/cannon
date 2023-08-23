# Module: actions

## Base Cannonfile Config

### RawChainDefinition

Ƭ **RawChainDefinition**: `Object`

Available properties for top level config

#### Type declaration

| Name           | Type                                                                                                                                                   | Description                                                                                                                               |
| :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| `name`         | `string`                                                                                                                                               | Name of the package                                                                                                                       |
| `version`      | `string`                                                                                                                                               | version of the package                                                                                                                    |
| `description?` | `string`                                                                                                                                               | Description for the package                                                                                                               |
| `keywords?`    | `string`[]                                                                                                                                             | keywords for search indexing                                                                                                              |
| `setting?`     | `Record`<`string`, { description?: string \| undefined; type?: "string" \| "number" \| "boolean" \| undefined; defaultValue?: string \| undefined; }\> | Object that allows the definition of values for use in next steps **`Example`** `toml [settings.owner] defaultValue: "some-eth-address" ` |

#### Defined in

[packages/builder/src/actions.ts:54](https://github.com/usecannon/cannon/blob/70c2852b/packages/builder/src/actions.ts#L54)

# @usecannon/cli

## Run

### Config

Ƭ **Config**: `Object`

Available properties for run step

#### Type declaration

| Name       | Type                    | Description                                                                                                                              |
| :--------- | :---------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `exec`     | `string`                | The javascript (or typescript) file to load                                                                                              |
| `func`     | `string`                | The function to call in this file                                                                                                        |
| `modified` | [`string`, ...string[]] | An array of files and directories that this script depends on. The cache of the cannonfile's build is recreated when these files change. |
| `args?`    | `string`[]              | Arguments passed to the function (after the ChainBuilder object)                                                                         |
| `env?`     | `string`[]              | Environment variables to be set on the script                                                                                            |
| `depends?` | `string`[]              | List of steps that this action depends on                                                                                                |

#### Defined in

[packages/cli/src/custom-steps/run.ts:70](https://github.com/usecannon/cannon/blob/70c2852b/packages/cli/src/custom-steps/run.ts#L70)

# Module: steps/contract

## Contract

### Config

Ƭ **Config**: `Object`

Available properties for contract step

#### Type declaration

| Name         | Type                                                                                                                                                                                                 | Description                                                                                                                |
| :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| `artifact`   | `string`                                                                                                                                                                                             | Artifact name or path of the target contract                                                                               |
| `create2?`   | `boolean`                                                                                                                                                                                            | Determines whether to deploy the contract using create2                                                                    |
| `from?`      | `string`                                                                                                                                                                                             | Contract deployer address. Must match the ethereum address format                                                          |
| `nonce?`     | `string`                                                                                                                                                                                             | -                                                                                                                          |
| `abi?`       | `string`                                                                                                                                                                                             | Abi of the contract being deployed                                                                                         |
| `abiOf?`     | `string`[]                                                                                                                                                                                           | An array of contract artifacts that have already been deployed with Cannon. This is useful when deploying proxy contracts. |
| `args?`      | (`string` \| `number` \| `boolean` \| `Record`<`string`, `string` \| `number` \| `boolean`\> \| (`string` \| `number` \| `boolean`)[] \| `Record`<`string`, `string` \| `number` \| `boolean`\>[])[] | Constructor or initializer args                                                                                            |
| `libraries?` | `Record`<`string`, `string`\>                                                                                                                                                                        | An array of contract action names that deploy libraries this contract depends on.                                          |
| `salt?`      | `string`                                                                                                                                                                                             | Used to force new copy of a contract (not actually used)                                                                   |
| `value?`     | `string`                                                                                                                                                                                             | Native currency value to send in the transaction                                                                           |
| `overrides?` | { gasLimit?: string \| undefined; }                                                                                                                                                                  | Override transaction settings                                                                                              |
| `depends?`   | `string`[]                                                                                                                                                                                           | List of steps that this action depends on                                                                                  |

#### Defined in

[packages/builder/src/steps/contract.ts:29](https://github.com/usecannon/cannon/blob/70c2852b/packages/builder/src/steps/contract.ts#L29)

# Module: steps/import

## Import

### Config

Ƭ **Config**: `Object`

Available properties for import step

#### Type declaration

| Name       | Type       | Description                                                                                                      |
| :--------- | :--------- | :--------------------------------------------------------------------------------------------------------------- |
| `source`   | `string`   | Source of the cannonfile package to import from Can be a cannonfile step name or package name                    |
| `chainId?` | `number`   | ID of the chain to import the package from                                                                       |
| `preset?`  | `string`   | Preset label of the package being imported                                                                       |
| `depends?` | `string`[] | Previous steps this step is dependent on **`Example`** `toml depends = ['contract.Storage', 'import.Contract'] ` |

#### Defined in

[packages/builder/src/steps/import.ts:19](https://github.com/usecannon/cannon/blob/70c2852b/packages/builder/src/steps/import.ts#L19)

# Module: steps/invoke

## Invoke

### Config

Ƭ **Config**: `Object`

Available properties for invoke step

#### Type declaration

| Name                 | Type                                                                                                                                                                                                                                                                                                                                                                    | Description                                                                                                                                        |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| `target`             | [`string`, ...string[]]                                                                                                                                                                                                                                                                                                                                                 | Names of the contract to call or contract action that deployed the contract to call                                                                |
| `func`               | `string`                                                                                                                                                                                                                                                                                                                                                                | Name of the function to call on the contract                                                                                                       |
| `abi?`               | `string`                                                                                                                                                                                                                                                                                                                                                                | JSON file of the contract ABI Required if the target contains an address rather than a contract action name.                                       |
| `args?`              | (`string` \| `number` \| `boolean` \| `Record`<`string`, `string` \| `number` \| `boolean`\> \| (`string` \| `number` \| `boolean`)[] \| `Record`<`string`, `string` \| `number` \| `boolean`\>[])[]                                                                                                                                                                    | Arguments to use when invoking this call.                                                                                                          |
| `from?`              | `string`                                                                                                                                                                                                                                                                                                                                                                | The calling address to use when invoking this call.                                                                                                |
| `fromCall?`          | { `func`: `string` ; `args?`: (`string` \| `number` \| `boolean` \| `Record`<`string`, `string` \| `number` \| `boolean`\> \| (`string` \| `number` \| `boolean`)[] \| `Record`<`string`, `string` \| `number` \| `boolean`\>[])[] }                                                                                                                                    | -                                                                                                                                                  |
| `fromCall.func`      | `string`                                                                                                                                                                                                                                                                                                                                                                | The name of a view function to call on this contract. The result will be used as the from input.                                                   |
| `fromCall.args?`     | (`string` \| `number` \| `boolean` \| `Record`<`string`, `string` \| `number` \| `boolean`\> \| (`string` \| `number` \| `boolean`)[] \| `Record`<`string`, `string` \| `number` \| `boolean`\>[])[]                                                                                                                                                                    | The arguments to pass into the function being called.                                                                                              |
| `value?`             | `string`                                                                                                                                                                                                                                                                                                                                                                | The amount of ether/wei to send in the transaction.                                                                                                |
| `overrides?`         | { `gasLimit`: `string` }                                                                                                                                                                                                                                                                                                                                                | Override transaction settings                                                                                                                      |
| `overrides.gasLimit` | `string`                                                                                                                                                                                                                                                                                                                                                                | -                                                                                                                                                  |
| `extra?`             | `Record`<`string`, { `event`: `string` ; `arg`: `number` ; `allowEmptyEvents?`: `boolean` }\>                                                                                                                                                                                                                                                                           | Object defined to hold extra transaction result data. For now its limited to getting event data so it can be reused in other steps                 |
| `factory?`           | `Record`<`string`, { `event`: `string` ; `arg`: `number` ; `artifact?`: `string` ; `abiOf?`: `string`[] ; `constructorArgs?`: (`string` \| `number` \| `boolean` \| `Record`<`string`, `string` \| `number` \| `boolean`\> \| (`string` \| `number` \| `boolean`)[] \| `Record`<`string`, `string` \| `number` \| `boolean`\>[])[] ; `allowEmptyEvents?`: `boolean` }\> | Object defined to hold deployment transaction result data. For now its limited to getting deployment event data so it can be reused in other steps |
| `depends?`           | `string`[]                                                                                                                                                                                                                                                                                                                                                              | Previous steps this step is dependent on                                                                                                           |

#### Defined in

[packages/builder/src/steps/invoke.ts:27](https://github.com/usecannon/cannon/blob/70c2852b/packages/builder/src/steps/invoke.ts#L27)

# Module: steps/provision

## Provision

### Config

Ƭ **Config**: `Object`

Available properties for provision step

#### Type declaration

| Name            | Type                          | Description                                                                                                     |
| :-------------- | :---------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| `source`        | `string`                      | Name of the package to provision                                                                                |
| `chainId?`      | `number`                      | ID of the chain to import the package from **`Default`** `ts - 13370 `                                          |
| `sourcePreset?` | `string`                      | Override the preset to use when provisioning this package. **`Default`** `ts - "main" `                         |
| `targetPreset?` | `string`                      | Set the new preset to use for this package. **`Default`** `ts - "main" `                                        |
| `options?`      | `Record`<`string`, `string`\> | The settings to be used when initializing this Cannonfile. Overrides any defaults preset in the source package. |
| `tags?`         | `string`[]                    | Additional tags to set on the registry for when this provisioned package is published.                          |
| `depends?`      | `string`[]                    | Previous steps this step is dependent on                                                                        |

#### Defined in

<<<<<<< HEAD
[packages/builder/src/steps/provision.ts:26](https://github.com/usecannon/cannon/blob/6cdf04ae/packages/builder/src/steps/provision.ts#L26)

# @usecannon/cli

## Run

### Config

Ƭ **Config**: `Object`

Available properties for run step

#### Type declaration

| Name       | Type                    | Description                                                                                                                              |
| :--------- | :---------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `exec`     | `string`                | The javascript (or typescript) file to load                                                                                              |
| `func`     | `string`                | The function to call in this file                                                                                                        |
| `modified` | [`string`, ...string[]] | An array of files and directories that this script depends on. The cache of the cannonfile's build is recreated when these files change. |
| `args?`    | `string`[]              | Arguments passed to the function (after the ChainBuilder object)                                                                         |
| `env?`     | `string`[]              | Environment variables to be set on the script                                                                                            |
| `depends?` | `string`[]              | List of steps that this action depends on                                                                                                |

#### Defined in

# [packages/cli/src/custom-steps/run.ts:70](https://github.com/usecannon/cannon/blob/6cdf04ae/packages/cli/src/custom-steps/run.ts#L70)

[packages/builder/src/steps/provision.ts:26](https://github.com/usecannon/cannon/blob/70c2852b/packages/builder/src/steps/provision.ts#L26)

> > > > > > > dd69ef74 (feat(docs): add mdx support)
