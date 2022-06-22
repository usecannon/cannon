# Cannon Documentation

Cannon is a [Hardhat](https://hardhat.org/]) plug-in that allows you to configure your protocol's scripts, keepers, and on-chain dependencies for automated provisioning and deployment. It is inspired by [Terraform](https://www.terraform.io/), [Docker](https://www.docker.com/), and [Docker Hub](https://hub.docker.com/search).

There are three ways you can use Cannon:

- **Use a Package** - After installing Cannon, call `npx hardhat cannon <package-name:version>`. This is similar to running `npx hardhat node`, except the specified package will be automatically provisioned.
- **`cannon.json`** - Create this file to define the chains where you'll deploy your smart contracts and your dependencies on those chains.
- **`cannonfile.toml`** - Create this file to define the scripts that should be executed and configurations relevant to your smart contracts.

## Getting Started

### Install Cannon

After you've installed Hardhat, install `hardhat-cannon`.

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

### Use a Package

If you'd like to run a local node with an existing protocol, you can rely on the built-in package manager. For example, the following command will start a local node (similar to running `npx hardhat node`) with a simple `Greeter.sol` contract already deployed.

```bash
npx hardhat cannon greeter:latest
```

If you'd like to customize this deployment, you can specify options.

```bash
npx hardhat cannon greeter:latest msg="Hello from Cannon"
```

Review a package's README for more information on the options available and other usage instructions.

### Create cannon.json

The example above is great for simple scenarios, but if your protocol depends on multiple protocols or multiple chains, then you can create a `cannon.json` file in the same directory as your `hardhat.config.js`.

Here's an example `cannon.json` file for a project where a smart contract will be deployed to Mainnet and Optimism that will interact with Synthetix on both networks and anticipate a keeper on Mainnet.

```json
{
  "name": "mySampleProject:latest",
  "chains": [
    {
      "deploy": [
        "mySampleProject:latest",
        "synthetix:2.62",
        "keeper:snapshot-keeper"
      ],
      "chainId": 1
    },
    {
      "deploy": ["mySampleProject:latest", "synthetix:2.62"],
      "chainId": 10
    }
  ]
}
```

Once you've created your `cannon.json` file, run `npx hardhat cannon` and Cannon will use the configuration defined in this file.

See [cannon.json Specification](#cannonjson-specification) for more details on how to set up this file.

### Create cannonfile.toml

If you'd like to automate your own deployments, add a `cannonfile.toml` file in the same directory as your `hardhat.config.js`. This can be set up in addition to a `cannon.json` file, or without one.

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
name = "myStorageCannon"
description = "Simple project to deploy a Storage contract"
version = "0.0.1"
tags = ["fun", "example"]

[setting.initialValue] # Create an overridable setting
defaultValue = "420" # This is the value to use if none is specified when npx hardhat cannon:build is called

[contract.myStorage] # Declares an action, the output of which can be referenced below as contracts.myStorage
artifact = "Storage" # Specifies the name of the contract to be deployed
step = 0 # Ensure this action is taken first

[invoke.changeStorage] # Declares an action to set the initial value
addresses = ["<%= contracts.myStorage.address %>"] # Sets the address of the contract to invoke
abi = "<%= contracts.myStorage.abi %>" # Sets the abi of the contract to invoke
func = "store" # Sets the name of the function to invoke
args = ["<%= settings.initialValue %>"] # Sets the list of arguments to pass to the function
step = 1 # Ensure this action is taken after the previous action
```

Then build your Cannonfile and run it on a local node:

```bash
npx hardhat cannon:build
npx hardhat cannon myStorageCannon:0.0.1 initialValue="69"
```

See [cannonfile.toml Specification](#cannonfiletoml-specification) for more details on how to set up this file.

## Deploy a Cannonfile

You can build and deploy a Cannonfile on a local node or a remote network with the `npx hardhat cannon:build` command.

Artifacts for your deployment will be written to a folder named `deployments`. This includes JSON files with the address and ABI for each of the deployed contracts.

### Local Node

You can run a cannonfile with the command `npx hardhat cannon <package name>:<package version>` followed by any settings. The package references can be that of a cannonfile you've built locally or one available in the package manager. If you don't specify a package name, Cannon will deploy the cannonfile for the current project by default.

#### Test Deployments on a Fork

You can verify the steps Cannon would take when deploying to a live network with the `--dry-run` flag. For example, the following command will start a local node on port 8545 with a fork of mainnet and then run your cannonfile on it.

```bash
npx hardhat cannon:build --dry-run mainnet --port 8545
```

### Remote Network

To deploy to a remote network, first [add a `network` entry to your `hardhat.config.js` file](https://hardhat.org/tutorial/deploying-to-a-live-network#deploying-to-remote-networks). Then, specify a network with your build command. For example, this command would deploy your cannonfile to rinkeby:

```bash
npx hardhat --network rinkeby cannon:build
```

#### Verify on Etherscan

After deploying to a live network, you can use the `cannon:verify` command to verify all of the deployed contracts on [Etherscan](https://www.etherscan.com).

First, install [hardhat-etherscan](https://hardhat.org/plugins/nomiclabs-hardhat-etherscan) in your project. Then, run `npx hardhat --network <network name> cannon:verify`.

## Publish a Package

Cannonfiles can be published to the registry, backed on Ethereum and IPFS.

We recommend using Infura to pin on IPFS using their API, though you can use any IPFS node. Create an Infura account and an IPFS project. You'll retrieve the `INFURA_IPFS_ID` and `INFURA_IPFS_SECRET` values from their dashboard to use below.

`PRIVATE_KEY` is the private key of an Ethereum wallet that will pay the gas to add the entry to the on-chain registry.

Add this section to your `hardhat.config.json`:

```json
{
  cannon: {
    publisherPrivateKey: process.env.PRIVATE_KEY,
    ipfsConnection: {
      protocol: 'https',
      host: 'ipfs.infura.io',
      port: 5001,
      headers: {
        authorization: `Basic ${Buffer.from(process.env.INFURA_IPFS_ID + ':' + process.env.INFURA_IPFS_SECRET).toString('base64')}`
      },
    }
  }
}
```

Then use the following commands to publish your package:

```bash
npx hardhat cannon:build
npx hardhat cannon:publish
```

If you have multiple Cannonfiles in your project, you can pass `--file` with the path to the specific `cannonfile.toml` you’d like to publish.

## cannon.json Specification

- `name` _<small>string</small>_ - This is the name of your protocol, which you can reference in the `deploy` section of this file.
- `chains` _<small>array</small>_ - This defines each of the chains you plan to deploy on and the protocols to be deployed on each of them.
  - `chainId` _<small>integer</small>_ - The id of the chain this will ultimately be deployed to. See [Chainlist](https://chainlist.org/) for reference.
  - `deploy` _<small>array</small>_ - This is an array of Cannonfiles to provision on this chain. It can be the `name` field for your protocol or the name of a package from the [registry](/search). The items in the array can also be arrays with a length of two, where the first item is the name of the package to use and the second item is an object with options to use when running this Cannonfile.
  - `port` _<small>integer</small>_ - Optionally, specify a port use for this node.

## cannonfile.toml Specification

Cannonfiles contain a series of actions which are executed at run-time. See [Create cannonfile.toml](##create-cannonfiletoml) for example usage. **Specify a `step` for each action used to ensure the execution occurs in the correct order.**

Each action has a type and a name. Each type accepts a specific set of inputs and modifies a return object. The return object is accessible in actions executed at later steps. The resulting return object is provided to any cannonfile that imports it with the `import` action.

Every action updates the return object by adding an entry to the `txns` key with the action’s name. The value of the entry is an object with the properties `hash` (which is the hash of this transaction) and `events` (which is an array of objects with the `name` of each event emitted by this call and the corresponding event data as `args`).

For example, the action below has the type `contract` and is named `myStorage`. It requires the input `artifact`, which is the name of the contract to deploy. (In this example, it’s the contract named `Storage`.) It will be executed first because it has specified `step` as 0.

```toml
[contract.myStorage]
artifact = "Storage"
step = 0
```

This updates the return object such that, for example, a later `invoke` action could call this contract with the input `target = ["<%= contracts.myStorage.address %>"]`.

There are five types of actions you can use in a Cannonfile: `contract`, `import`, `run`, `invoke`, and `setting`.

### contract

The `contract` action deploys a contract.

**Required Inputs**

- `artifact` - Specifies the name of the contract to be deployed

**Optional Inputs**

- `args` - Specifies the arguments to provide the constructor function
- `libraries` - An array of contract action names that deploy libraries this contract depends on.

**Outputs**  
This action updates the return object by adding an entry to the `contracts` key with the action’s name. The value of the entry is an object with the following properties:

- `abi` - The ABI of the deployed contract
- `address` - The address fo the deployed contract
- `deployTxnHash` - The transaction hash of the deployment

### import

The `import` action will import a cannonfile from a package hosted with the package manager. **Third-party packages can execute arbitrary code when imported. Only import packages that you trust.**

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
factory.MyPoolDeployment.event = "NewDeployment"
factory.MyPoolDeployment.arg = 0
```

Specifically, this would anticipate this invoke call will emit an event named _NewDeployment_ with a contract address as the first data argument (per `arg`, a zero-based index). This contract should implement the `Pool` contract. Now, a subsequent `invoke` step could set `target = ["MyPoolDeployment"]`.

If the invoke action emits multiple events, you can specify them by index. For example `"MyPoolDeployment.PoolFactory.NewDeployment.4"` would reference the fifth time the specified event is emitted.

These contracts are added to the return object as they would be if deployed by a `contract` action.

### setting

The `setting` action defines a user-configurable option that can be referenced in other actions’ inputs. For example, a cannonfile may define `[setting.sampleSetting]` and then reference `sampleValue` as `"<%= settings.sampleSetting %>"` after running `npx hardhat cannon sampleSetting="sampleValue"`

**Optional Inputs**

- `defaultValue` - Specifies the value to be used by this setting if the user doesn’t provide a value at run time.

**Outputs**  
This action updates the return object by adding an entry to the `settings` key with the action’s name. The value of the entry is what has been passed in by the user at run time. Otherwise, the default value is used if specified.

### run

The `run` action executes a custom script.

<div style="padding: 20px; background: rgb(14 28 60); margin-bottom: 20px; border: 1px solid rgb(13 20 38)">
⚠️ <strong>Avoid using the run step when possible, as this can negatively impact the ability for this cannonfile to be imported into other cannonfiles.</strong> (More information coming soon.)
</div>

**Required Inputs**

- `exec` - The javascript (or typescript) file to load
- `func` - The function to call in this file

**Optional Inputs**

- `args` - The arguments to pass the script
- `env` - Environment variables to be set on the script
- `modified` - An array of files and directories that this script depends on. The cache of the cannonfile's build is recreated when these files change.

**Outputs**  
This action updates the return object by merging the object returned from the script under keys `contracts` and `txns`. These objects should follow the structure of output modifications created by a `contract` action.
