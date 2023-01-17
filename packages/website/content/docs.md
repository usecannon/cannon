# Cannon Documentation

Cannon is a smart contract deployment tool and package manager. It draws inspiration from Terraform, Docker, and npm. Users define **Cannonfiles**, which specify a desired state of blockchain (local, testnet, or mainnet). For example, you might want to _deploy_ a smart contract and _invoke_ a function on it to set some configuration. You can also _import_ packages to connect protocol which depend on one another.

Then, you can use Cannon to **build** a blockchain into the state specified by the Cannonfile. This process works the same for local development, testnets, forks, and mainnet deployments. Deployments can be shared as packages via the decentralized package manager.

There are many different use cases for Cannon:

- Front-end Development - Developers can easily download a package, run it on a local node, and retrieve the addresses and ABIs. When it's ready for production, the front-end application can simply use the addresses from the package which correspond to the user's network.
- Smart Contract Development - Developers can set up environments with all of their smart contracts configured however they’d like and also import other packages for integrations.
- QA/Testing - Development builds can be used and inspected prior to deployment to ensure implementations are accurate and robust.
- Protocol Deployment, Upgrades, and Configuration - When smart contracts are ready for deployment (or upgrade), the same Cannonfiles used in development and testing can be built on remote networks.
- Continuous Integration - Testing pipelines can rely on Cannon to create nodes for integration and E2E tests.
- GitOps - Cannonfiles can be managed in git such that an organization can maintain a clear 'source of truth' for the deployment state.

## Command-line Tool

To get started, run

```bash
npx @usecannon/cli synthetix
```

This command will download the latest [synthetix package](/packages/synthetix) from the package registry and run it on a local node. See _run_ in the Cannon Commands section below for more information.

## Package Manager

Builds are created as packages which contain all the deployment results and build settings for your chain. Based on your local system configuration, these packages are uploaded as blobs to IPFS. You can share packages by either sending the IPFS Qm hash, or by registering the package on-chain with our registry contract.

## Hardhat Plug-in

The Hardhat plug-in wraps the command-line tool to automatically use defaults from a project's Hardhat configuration file.

If you’re using Cannon with Hardhat, you can install the Hardhat plug-in `hardhat-cannon`.

```bash
npm install hardhat-cannon
```

Then, include Cannon at the top of your `hardhat.config.js`.

```js
require('hardhat-cannon');
```

If your project uses Typescript instead, include Cannon in `hardhat.config.ts`.

```js
import 'hardhat-cannon';
```

Finally, set `cannon` as your default network in your Hardhat config file:

```json
{
  "defaultNetwork": "cannon"
}
```

Now you’ll be able to use the Hardhat plug-in commands specified in the [Cannon Commands](#cannon-commands) section below.

## Gnosis Safe Plug-in

_t.c._

# Technical Reference

## Cannon Commands

Run the commands below with `npx @usecannon/cli <command>`. If no command is specified, the CLI will execute the "run" command.

If you’re using the Hardhat plug-in, you can access the following commands as tasks. For example, the build command could be executed with `npx hardhat cannon:build`.

### run

The `run` command starts a local node with the specified package. It opens an interactive CLI where you can access logs and interact with the deployed contracts.

**Arguments**

- `<packageNames>` - Name and version of the package to run. Assumes `latest` if no version if specified. Settings for the package can be specified following the package name. For example, `npx @usecannon/cli synthetix` and `npx @usecannon/cli synthetix:2.75 owner=0x0000 erc20 symbol=TKN` is a valid command.

**Options**

- `--port` - Port which the JSON-RPC server will be exposed. (_Default: "8545"_)
- `--fork` - Fork the network at the specified RPC url. The chain ID for the deployment used from the package is determined by the RPC endpoint. (For the Hardhat plug-in, use `--network` to reference a network in your Hardhat configuration instead.)
- `--preset` - Load an alternative preset. (_Default: "main"_)
- `--logs` - Show RPC logs instead of an interactive prompt.
- `--impersonate` - Create impersonated signers instead of using real wallets. (_Default: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"_)
- `--fund-addresses` - Pass a list of addresses to receive a balance of 10,000 ETH.
- `--mnemonic` - Use the specified mnemonic to initialize a chain of signers while running.
- `--private-key` - Use the specified private key hex to interact with the contracts.

### build

The `build` command will attempt to build a specified blockchain into the state defined by a Cannonfile.

**Arguments**

- `<cannonfile>` - Path to a cannonfile (_Default: "cannonfile.toml"_)
- `<settings...>` - Custom settings for building the cannonfile

**Options**

- `--network` - RPC endpoint to execute the deployment on. This builds for a local node if not specified. (For the Hardhat plug-in, reference a network in your Hardhat configuration instead.)
- `--preset` - The preset label for storing the build with the given settings (_Default: "main"_)
- `--dry-run` - Simulate building on a local fork rather than deploying on the real network.
- `--private-key` - Specify a private key which may be needed to sign a transaction.
- `--wipe` - Clear the existing deployment state and start this deploy from scratch.
- `--upgrade-from` - Specify a package to use as a new base for the deployment.
- `--contracts-directory` - Contracts source directory which will be built using Foundry and saved to the path specified with --artifacts (_Default: "./src"_)
- `--artifacts-directory` - Path to a directory with your artifact data (_Default: "./out"_)

### verify

Verify a package on Etherscan.

**Arguments**

- `<packageName:packageVersion>` - Name and version of the package to verify

**Options**

- `--api-key` - Etherscan API key
- `--network` - Network of deployment to verify (_Default: "mainnet"_)

### publish

Publish a Cannon package to the registry for all networks where this package has been deployed.

**Arguments**

- `<packageName:packageVersion>` - Name and version of the package to publish

**Options**

- `--privateKey` - Private key of the wallet to use when publishing.
- `--preset` - Preset name to use (_Default: "main"_)
- `--tags` - Comma separated list of labels (_Default: "latest"_)
- `--gas-limit` - The maximum units of gas spent for the registration transaction')
- `--max-fee-per-gas` - `The maximum value (in gwei) for the base fee when submitting the registry transaction.
- `--max-priority-fee-per-gas` - The maximum value (in gwei) for the miner tip when submitting the registry transaction.
- `--quiet` - Only output final JSON object at the end, no human readable output.

### inspect

Inspect the details of a Cannon package.

**Arguments**

- `packageName:packageVersion` - The name and version of a package. Version defaults to `latest` if not specified. (_Example: synthetix:latest_)

**Options**

- `--chain-id` - Chain ID of the variant to inspect
- `--preset` - Preset of the variant to inspect
- `--json` - Output as JSON (_Default: false_)
- `--write-deployments` - Path to write the deployments data (address and ABIs), like "./deployments"

### interact

Start an interactive terminal to use with a Cannon package's deployment on a live network. (This is an alternative to interacting with a local fork using the run command.) This command is not available in the Hardhat plug-in.

**Arguments**

- `packageName:packageVersion` - The name and version of a package. Version defaults to `latest` if not specified. (_Example: synthetix:latest_)

**Options**

- `--network` - RPC endpoint to execute interactions on. The chain ID for the deployment used from the package is determined by the RPC endpoint.
- `--preset` - The preset to load. (_Default: "main"_)
- `--mnemonic` - Use the specified mnemonic to initialize a chain of signers while running.
- `--private-key` - Use the specified private key hex to interact with the contracts.

### plugin add

Specify a package to install via NPM and register as a Cannon plug-in.

**Arguments**

- `name` - The name of the NPM package.

### plugin remove

Specify a package that was added as a Cannon plug-in and remove it.

**Arguments**

- `name` - The name of the NPM package.

### setup

Start the wizard to create or update a `settings.json` file for Cannon that specifies IPFS and Ethereum RPC configuration.

## Cannonfile Specification

Cannonfiles contain a series of actions defined in a TOML file.

Each action has a type and a name. Each type accepts a specific set of inputs and modifies a return object. The return object is accessible in actions executed at later steps. The resulting return object is provided to any cannonfile that imports it with the `import` action.

<div style="padding: 20px; background: rgb(14 28 60); margin-bottom: 20px; border: 1px solid rgb(13 20 38)">
⚠️ Use the <code>depends</code> input to specify an array of actions that a particular action relies upon. For example, you must include <code>depends = ["contract.myStorage"]</code> on an invoke action which calls a function on a contract deployed by the contract.myStorage action. Note that two actions which effect the same state need to have one depend on the other (like two transfer functions that may effect the same user balances).
</div>

Every action updates the return object by adding an entry to the `txns` key with the action’s name. The value of the entry is an object with the properties `hash` (which is the hash of this transaction) and `events` (which is an array of objects with the `name` of each event emitted by this call and the corresponding event data as `args`).

For example, the action below has the type `contract` and is named `myStorage`. It requires the input `artifact`, which is the name of the contract to deploy. (In this example, it’s the contract named `Storage`.)

```toml
[contract.myStorage]
artifact = "Storage"
```

This updates the return object such that, for example, a later `invoke` action could call this contract with the input `target = ["<%= contracts.myStorage.address %>"]`.

There are five types of actions you can use in a Cannonfile: `contract`, `import`, `run`, `invoke`, and `setting`.

### contract

The `contract` action deploys a contract.

**Required Inputs**

- `artifact` - Specifies the name of the contract to be deployed

**Optional Inputs**

- `args` - Specifies the arguments to provide the constructor function
- `abiOf` - An array of contract artifacts that you've already deployed with Cannon. This is useful when deploying proxy contracts.
- `abi` - Specifies the contract that should be used for the ABI.
- `libraries` - An array of contract action names that deploy libraries this contract depends on. **Make sure you also specify these steps in a `depends` input to make sure the libraries are deployed prior to this step.**
- `from` - Address to send the transaction from. It
- `salt` - The salt is a string which, when changed, will result in a new contract deployment. (_Default: ''_)
- `create2` - Uses `CREATE2` resulting in the same contract deployment address across networks (assuming the same contract bytecode, constructor arguments, and salt are used). (_Default: false_)

**Outputs**
This action updates the return object by adding an entry to the `contracts` key with the action’s name. The value of the entry is an object with the following properties:

- `abi` - The ABI of the deployed contract
- `address` - The address fo the deployed contract
- `deployTxnHash` - The transaction hash of the deployment

### import

The `import` action will import a cannonfile from a package hosted with the package manager.

**Required Inputs**

- `source` - The name of the package to import

**Optional Inputs**

- `chainId` - Optionally override the chain ID for the deployment information to import.
- `preset` - Optionally override "main" as the preset for the deployment information to import.

**Outputs**
This action updates the return object by adding an entry to the `imports` key with the action’s name. The value of the entry is the return object of the imported cannonfile. For example, if a package is imported with `[imports.uniswap]` and its cannonfile deploys a contract with `[contract.pair]` which outputs `address`, this address would be accessible at `<%= imports.uniswap.contracts.pair.address %>`.

### invoke

The `invoke` action calls a specified function on your node.

**Required Inputs**

- `target` - The name of the contract action that deployed the contract to call or the address of the contract. If the contract was deployed from an imported package, it will be namespaced under the import action’s name using dot notation. For example, if a package were imported with `[import.uniswap]` and this package's cannonfile deploys a contract with `[contract.pair]`, you could call could call a function on this contract by passing `["uniswap.pair"]` into this input.
- `abi` - The ABI of the contract to call. This is optional if the target contains a contract action name rather than an address.
- `func` - The name of the function to call

**Optional Inputs**

- `args` - The arguments to use when invoking this call
- `from` - The calling address to use when invoking this call
- `fromCall.func` - The name of a view function to call on this contract. The result will be used as the `from` input.
- `fromCall.args` - The arguments to pass into the function above.
- `factory` - See _Referencing Factory-deployed Contracts_ below.

**Outputs**
This action only updates the return object by adding an entry to the `txns` key.

#### Referencing Factory-deployed Contracts

Smart contracts may have functions which deploy other smart contracts. Contracts which deploy others are typically referred to as factory contracts. You can reference contracts deployed by factories in your cannonfile.

For example, if the `deployPool` function below deploys a contract, the following invoke command registers that contract based on event data emitted from that call.

```toml
[invoke.deployment]
target = ["PoolFactory"]
func = "deployPool"
factory.MyPoolDeployment.artifact = "Pool"
# alternatively, if the code for the deployed contractis not available in your artifacts, you can also reference the ABI like:
# factory.MyPoolDeployment.abiOf = "PreviousPool"
factory.MyPoolDeployment.event = "NewDeployment"
factory.MyPoolDeployment.arg = 0
```

Specifically, this would anticipate this invoke call will emit an event named _NewDeployment_ with a contract address as the first data argument (per `arg`, a zero-based index). This contract should implement the `Pool` contract. Now, a subsequent `invoke` action could set `target = ["MyPoolDeployment"]`.

If the invoke action emits multiple events, you can specify them by index. For example `"MyPoolDeployment.PoolFactory.NewDeployment.4"` would reference the fifth time the specified event is emitted.

These contracts are added to the return object as they would be if deployed by a `contract` action.

### setting

The `setting` action defines a user-configurable option that can be referenced in other actions’ inputs. For example, a cannonfile may define `[setting.sampleSetting]` and then reference `sampleValue` as `"<%= settings.sampleSetting %>"` after running `npx hardhat cannon sampleSetting="sampleValue"`

**Optional Inputs**

- `defaultValue` - Specifies the value to be used by this setting if the user doesn’t provide a value at run time.
- `description` - Human-friendly explanation of this setting.

**Outputs**
This action updates the return object by adding an entry to the `settings` key with the action’s name. The value of the entry is what has been passed in by the user at run time. Otherwise, the default value is used if specified.

### provision

The `provision` command attempts to deploy the specified package (unlike the import command, which only injests existing deployment data).

<div style="padding: 20px; background: rgb(14 28 60); margin-bottom: 20px; border: 1px solid rgb(13 20 38)">
⚠️ <strong>Third-party packages can execute arbitrary code on your computer when provisioning. Only provision packages that you have verified or trust.</strong>
</div>

**Required Inputs**

- `source` - The name of the package to provision

**Optional Inputs**

- `options` - The settings to be used when initializing this Cannonfile which overrides any defaults preset in the source package.
- `chainId` - Override the chain ID to use when provisioning this package. (_Default: 13370_)
- `preset` - Override the preset to use when provisioning this package. (_Default: main_)
- `tags` - Additional tags to set on the registry for when this provisioned package is published.

### run

The `run` action executes a custom script. This script is passed a [ChainBuilder](https://github.com/usecannon/cannon/blob/main/packages/builder/src/builder.ts#L72) object as parameter. **The run command breaks composability. Only use this as a last resort.** Use a custom Cannon plug-in if this is necessary for your deployment.

**Required Inputs**

- `exec` - The javascript (or typescript) file to load
- `func` - The function to call in this file

**Optional Inputs**

- `args` - Arguments passed to the function (after the ChainBuilder object).
- `env` - Environment variables to be set on the script
- `modified` - An array of files and directories that this script depends on. The cache of the cannonfile's build is recreated when these files change.

**Outputs**
This action updates the return object by merging the object returned from the script under keys `contracts` and `txns`. These objects should follow the structure of output modifications created by a `contract` action.

## Cannon Plug-ins

Cannon plug-ins can be added and removed via NPM. This is allow for the creation of custom steps in Cannonfiles. _Additional documentation coming soon._
