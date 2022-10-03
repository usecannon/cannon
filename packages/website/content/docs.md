# Cannon Documentation

Cannon is a CLI (compatible with [Foundry](https://github.com/foundry-rs/foundry) and [Hardhat](https://hardhat.org/])) that allows you to configure your protocol's contracts, initialization scripts, and on-chain dependencies in Cannonfiles. Cannonfiles are built into packages, which can be published to the registry (backed on Ethereum and IPFS). Packages can be run on local nodes, deployed to live chains, and imported into other Cannonfiles.

## Getting Started

### Quick Start

Get started by running the following command:

```bash
npx @usecannon/cli synthetix
```

This command will download the latest [synthetix package](/packages/synthetix) into your local cannon directory (`~/.local/share/cannon`) and start an [Anvil](https://github.com/foundry-rs/foundry/tree/master/anvil) node with it. Run `npx @usecannon/cli --help` for more information or see documentation for the [run](#run) command below.

You can also install Cannon globally (instead of using npx) with `npm install -g @usecannon/cli`. Then use `cannon` in place of `npx @usecannon/cli`.

### Install Hardhat Plug-in

If you’re using Cannon with Hardhat, you can install the Hardhat plug-in `hardhat-cannon`. If you’re using Foundry, you can skip this.

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

### Build a Cannonfile

If you'd like to automate your own deployments, create a `cannonfile.toml` file in the root of your Foundry or Hardhat project.

Suppose we have the following contract that we'd like to deploy.

```solidity
contract Storage {
    uint256 number;

    function store(uint256 num) public {
        number = num;
    }

    function retrieve() public view returns (uint256){
        return number;
    }
}
```

To deploy the contract and set an initial value, you could create the following Cannonfile:

```toml
name = "myStorage"
description = "Simple project to deploy a Storage contract"
version = "0.0.1"
keywords = ["fun", "example"]

[setting.initialValue] # Create an overridable setting
defaultValue = "420" # This is the value to use if none is specified when npx hardhat cannon:build is called

[contract.myStorage] # Declares an action, the output of which can be referenced below as contracts.myStorage
artifact = "Storage" # Specifies the name of the contract to be deployed

[invoke.changeStorage] # Declares an action to set the initial value
addresses = ["<%= contracts.myStorage.address %>"] # Sets the address of the contract to invoke
abi = "<%= contracts.myStorage.abi %>" # Sets the abi of the contract to invoke
func = "store" # Sets the name of the function to invoke
args = ["<%= settings.initialValue %>"] # Sets the list of arguments to pass to the function
depends = ["contract.myStorage"] # Ensure this action is taken after the previous action
```

Then build your Cannonfile and run it on a local node.

**For Foundry:**

```bash
npx @usecannon/cli build
npx @usecannon/cli myStorageCannon:0.0.1 initialValue="69"
```

**For Hardhat:**

```bash
npx hardhat cannon:build
npx hardhat cannon myStorageCannon:0.0.1 initialValue="69"
```

See [cannonfile.toml Specification](#cannonfiletoml-specification) for more details on how to set up this file.

## Cannon Commands

If you’re using the Hardhat plug-in, you can access the following commands as tasks. For example, the build command could be executed with `npx hardhat cannon:build`.

### run

The `run` command starts an [Anvil](https://github.com/foundry-rs/foundry/tree/master/anvil) node with the specified package. If it isn't found in your your local cannon directory (`~/.local/share/cannon`), it will be downloaded there from the [Cannon registry](/search).

If the CLI is run without a command specified, it will use the run command.

**Arguments**

- `<packageNames>` - Name and version of the package to run. Assumes `latest` if no version if specified. Settings for the package can be specified following the package name. For example, `synthetix` and `npx @usecannon/cli synthetix:2.75 owner=0x0000 erc20 symbol=TKN` are both valid arguments.

**Options**

- `--port` - Port which the JSON-RPC server will be exposed (_Default: "8545"_)
- `--fork` - Fork the network at the specified RPC url
- `--preset` - Load an alternate setting preset (_Default: "main"_)
- `--cannon-directory` - Path to a custom package directory (_Default: "~/.local/share/cannon"_)
- `--registry-rpc-url` - URL of the JSON-RPC server used to query the registry (_Default: "https://cloudflare-eth.com/v1/mainnet"_)
- `--registry-address` - Address of the registry contract (_Default: "0xA98BE35415Dd28458DA4c1C034056766cbcaf642"_)
- `--registry-ipfs-url` - Endpoint used to retrieve IPFS resources (_Default: "https://usecannon.infura-ipfs.io"_)
- `--write-deployments` - Path to write the deployments data (address and ABIs), like `./deployments`
- `--logs` - Show RPC logs instead of an interactive prompt
- `--impersonate` - Create impersonated signers instead of using real wallets')
- `--fund-addresses` - Pass a list of addresses to receive a balance of 10,000 ETH

### build

The `build` command takes a cannonfile and generates a package in your local cannon directory.

**Arguments**

- `<cannonfile>` - Path to a cannonfile (_Default: "cannonfile.toml"_)
- `<settings...>` - Custom settings for building the cannonfile

**Options**

- `--preset` - The preset label for storing the build with the given settings (_Default: "main"_)
- `--cannon-directory` - Path to a custom package directory (_Default: "~/.local/share/cannon"_)
- `--registry-rpc-url` - URL of the JSON-RPC server used to query the registry (_Default: "https://cloudflare-eth.com/v1/mainnet"_)
- `--registry-address` - Address of the registry contract (_Default: "0xA98BE35415Dd28458DA4c1C034056766cbcaf642"_)
- `--registry-ipfs-url` - Endpoint used to retrieve IPFS resources (_Default: "https://usecannon.infura-ipfs.io"_)
- `--artifacts-directory` - Path to a directory with your artifact data (_Default: "./out"_)
- `--contracts-directory` - Contracts source directory which will be built using Foundry and saved to the path specified with --artifacts (_Default: "./src"_)

### deploy

The `deploy` command takes a package and deploys it to a specified network. This also updates the package with data about this deployment.

**Arguments**

- `<packageNames>` - Name and version of the packages to deploy. Assumes `latest` if no version if specified. Settings for the package can be specified following the package name.

**Options**

- `--network-rpc` - **Required.** URL of a JSON-RPC server to use for deployment
- `--private-key` - **Required.** Private key of the wallet to use for deployment
- `--preset` - The preset label for storing the build with the given settings (_Default: "main"_)
- `--cannon-directory` - Path to a custom package directory (_Default: "~/.local/share/cannon"_)
- `--write-deployments` - Path to write the deployments data (address and ABIs), like `./deployments`
- `--prefix` - Specify a prefix to apply to the deployment artifact outputs
- `--dry-run` - Simulate this deployment process without deploying the contracts to the specified network

### verify

Verify a package on Etherscan.

**Arguments**

- `<packageName>` - Name and version of the package to publish

**Options**

- `--apiKey` - Etherscan API key
- `--network` - Network of deployment to verify (_Default: "mainnet"_)
- `--directory` - Path to a custom package directory (_Default: "~/.local/share/cannon"_)

### publish

Publish a Cannon package to the registry.

**Arguments**

- `<packageName>` - Name and version of the package to publish

**Options**

- `--directory` - Path to a custom package directory (_Default: "~/.local/share/cannon"_)
- `--tags` - Comma separated list of labels for your package (_Default: "latest"_)
- `--registryAddress` - Address for a custom package registry (_Default: "0xA98BE35415Dd28458DA4c1C034056766cbcaf642"_)
- `--registryEndpoint` - Address for RPC endpoint for the registry (_Default: "https://cloudflare-eth.com/v1/mainnet"_)
- `--ipfsEndpoint` - Address for an IPFS endpoint (_Example: https://ipfs.infura.io:5001_)
- `--ipfsAuthorizationHeader` - Authorization header for requests to the IPFS endpoint (_Example: Basic abc:123_)
- `--privateKey` - Private key of the wallet to use when publishing

### packages

List all packages in the local Cannon directory.

**Options**

- `--directory` - Path to a custom package directory (_Default: "~/.local/share/cannon"_)

### inspect

Inspect the details of a Cannon package.

**Arguments**

- `packageName` - The name and version of a package. Version defaults to `latest` if not specified. (_Example: synthetix:latest_)

**Options**

- `--directory` - Path to a custom package directory (_Default: "~/.local/share/cannon"_)
- `--json` - Output as JSON (_Default: false_)

### import

Import a Cannon package from a zip archive.

**Arguments**

- `importFile` - Relative path and filename to package archive. (_Example: synthetix.latest.zip_)

**Options**

- `--directory` - Path to a custom package directory (_Default: "~/.local/share/cannon"_)

### export

Export a Cannon package as a zip archive.

**Arguments**

- `packageName` - The name and version of a package. Version defaults to `latest` if not specified. (_Example: synthetix:latest_)
- `outputFile` - Relative path and filename to export package archive (_Default: "./{packageName.packageVersion}.zip"_)

**Options**

- `--directory` - Path to a custom package directory (_Default: "~/.local/share/cannon"_)

## cannonfile.toml Specification

Cannonfiles contain a series of actions which are executed at run-time. See [Create cannonfile.toml](##create-cannonfiletoml) for example usage.

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
- `abi` - Specifies the contract that should be used for the ABI. This is useful when deploying proxy contracts.
- `libraries` - An array of contract action names that deploy libraries this contract depends on. **Make sure you also specify these steps in a `depends` input to make sure the libraries are deployed prior to this step.**

**Outputs**
This action updates the return object by adding an entry to the `contracts` key with the action’s name. The value of the entry is an object with the following properties:

- `abi` - The ABI of the deployed contract
- `address` - The address fo the deployed contract
- `deployTxnHash` - The transaction hash of the deployment

### import

The `import` action will import a cannonfile from a package hosted with the package manager.

<div style="padding: 20px; background: rgb(14 28 60); margin-bottom: 20px; border: 1px solid rgb(13 20 38)">
⚠️ <strong>Third-party packages can execute arbitrary code on your computer when imported. Only import packages that you have verified or trust.</strong>
</div>

**Required Inputs**

- `source` - The name of the package to import

**Optional Inputs**

- `options` - The options to be used when initializing this cannonfile

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

### run

The `run` action executes a custom script. This script is passed a [ChainBuilder](https://github.com/usecannon/cannon/blob/main/packages/builder/src/builder.ts#L72) object as parameter. **Use the provider in the chain builder object when interacting with your deployment.**

**Required Inputs**

- `exec` - The javascript (or typescript) file to load
- `func` - The function to call in this file

**Optional Inputs**

- `args` - Arguments passed to the function (after the ChainBuilder object).
- `env` - Environment variables to be set on the script
- `modified` - An array of files and directories that this script depends on. The cache of the cannonfile's build is recreated when these files change.

**Outputs**
This action updates the return object by merging the object returned from the script under keys `contracts` and `txns`. These objects should follow the structure of output modifications created by a `contract` action.

# Guides

## Build a Protocol

**Coming soon.**

- Set up a Foundry project
- Write a contract and cannonfile that interacts with Synthetix
- Deploy it connected to the live protocol

## Build a dApp

**Coming soon.**

- Use the CLI to load the Synthetix package
- Export ABIs/addresses
- Interact with the protocol using wagmi.sh

## Build an e2e Test

**Coming soon.**

- Use the CLI to load the Synthetix package
- Run a basic test using Synpress
- Integrate with a CI tool

## Deploy a Protocol

For this guide, we’ll assume you have a Hardhat project with the `hardhat-cannon` plug-in installed and a `cannonfile.toml` that successfully builds when you call `npx hardhat cannon:build`. For information about deploying a Foundry project, see documentation for the [deploy](#deploy) command.

### Properly configure Hardhat

To perform all of the tasks below, your `hardhat.config.js` should look something like this (with the proper values in your `.env` file):

```json
{
  networks: {
    rinkeby: {
      url: process.env.RINKEBY_PROVIDER_URL
      chainId: 4,
      accounts: [process.env.PRIVATE_KEY],
    },
    mainnet: {
      url: process.env.MAINNET_PROVIDER_URL
      chainId: 1,
      accounts: [process.env.PRIVATE_KEY],
    }
  },
  cannon: {
    ipfsConnection: {
      protocol: 'https',
      host: 'ipfs.infura.io',
      port: 5001,
      headers: {
        authorization: `Basic ${Buffer.from(process.env.INFURA_IPFS_ID + ':' + process.env.INFURA_IPFS_SECRET).toString(
          'base64'
        )}`
      }
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  }
}
```

### Do a dry run

You can verify the steps Cannon would take when deploying to a live network with the `--dry-run` flag.

```bash
npx hardhat cannon:deploy --network <network name> --dry-run
```

### Deploy to a live network

Then remove the `--dry-run` flag to actually deploy. This will use the account associated with the private key for the network you select in your `hardhat.config.js` file.

```bash
npx hardhat cannon:deploy --network <network name>
```

### Verify your contracts on Etherscan

After deploying to a live network, you can use the `cannon:verify` command to verify all of the deployed contracts on [Etherscan](https://www.etherscan.com).

First, install [hardhat-etherscan](https://hardhat.org/plugins/nomiclabs-hardhat-etherscan) in your project. Then run:

```bash
npx hardhat cannon:verify --network <network name>
```

### Inspect your package

Prior to publishing your package to a registry, inspect its contents with the following command. Your package contains information about your live network deployments which can be retrieved by the CLI when passing the `--write-deployments <path>` option.

```bash
npx hardhat cannon:inspect
```

### Publish your package to the registry

You can push your package to the registry, backed on Ethereum and IPFS, so that others can run it with the CLI or import it into their own cannonfiles.

This will use the account associated with the private key in the `networks.mainnet` section of your Hardhat configuration file to execute the `publish` function on [the registry](https://etherscan.io/address/0xA98BE35415Dd28458DA4c1C034056766cbcaf642) after uploading the package to IPFS.

```bash
npx hardhat cannon:publish --network mainnet
```

For unofficial releases, you can use the import/export commands, or other deployments of the [package registry](/packages/registry). We’ve deployed an instance on rinkeby that can be used with the following command:

```bash
npx hardhat cannon:publish --network rinkeby --registry-address 0x79E25D87432920FC5C187e14676FA6a8A8a00418
```
