# Cannon Documentation

Cannon is a [Hardhat](https://hardhat.org/]) plug-in that allows you to configure your protocol's scripts, keepers, and on-chain dependencies for automated provisioning and deployment. It is inspired by [Docker](https://www.docker.com/) and [Terraform](https://www.terraform.io/).

There are three ways you can use Cannon:

* **Use a Package** - After installing Cannon, call `npx hardhat cannon <package-name:version>`. This is similar to running `npx hardhat node`, except the specified package will be automatically provisioned.
* **`cannon.json`** - Create this file to define the chains where you'll deploy your smart contracts and your dependencies on those chains.
* **`cannonfile.toml`** - Create this file to define the scripts that should be executed and configurations relevant to your smart contracts.

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
            "deploy": [
              "mySampleProject:latest",
              "synthetix:2.62"
            ],
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

Then build and run your Cannonfile:
```bash
npx hardhat compile
npx hardhat cannon:build
npx hardhat cannon myStorageCannon:0.0.1 initialValue="69"
```

*Note that you could simplify the example above by removing the `initialValue` option. This would entail removing the `[setting.initialValue]` section and setting args with `args=["69"]`*

See [cannonfile.toml Specification](#cannonfiletoml-specification) for more details on how to set up this file.

## Deploy to Production

Cannon uses Hardhat's internal network to load settings required to deploy to your desired network. At minimum, you must supply:
* JSON-RPC URL which can receive submitted transactions for the network
* Signer . To submit transactions to this network, you will need to 

When everything is ready, you can deploy to a live network:

```bash
npx hardhat --network <network name> cannon:build
```

Artifacts for your deployment will be written to a folder named `deployments`. Here you will be able to find the address and ABI for each contract as JSON files.

### Test Deployment on a Fork

You can verify the steps Cannon would take when deploying to a live network with the `--dry-run` flag. For example:

```
npx hardhat --network <network name> cannon:build --dry-run --run 8545
```

After the run is complete, the node remains running on the port specified with the `--run` flag, so you can run on-chain tests in a separate terminal.

## Publish a Package

Cannonfiles can be published to the registry, backed on Ethereum and IPFS.

We recommend using Infura to pin on IPFS using their API, though you can use any IPFS node. Create an Infura account and an IPFS project. You'll retrieve the `INFURA_IPFS_ID` and `INFURA_IPFS_SECRET` values from their dashboard to use below.

`PRIVATE_KEY` is the private key of an Ethereum wallet that will pay the gas to add the entry to the  on-chain registry.

Add this section to your hardhat.config.json:
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
npx hardhat compile
npx hardhat cannon:build
npx hardhat cannon:publish
```

If you have multiple Cannonfiles in your project, you can pass `--file` with the path to the specific `cannonfile.toml` you’d like to publish.

## cannon.json Specification

* `name` *<small>string</small>* - This is the name of your protocol, which you can reference in the `deploy` section of this file.
* `chains` *<small>array</small>* - This defines each of the chains you plan to deploy on and the protocols to be deployed on each of them.
  * `chainId` *<small>integer</small>* - The id of the chain this will ultimately be deployed to. See [Chainlist](https://chainlist.org/) for reference.
  * `deploy` *<small>array</small>* - This is an array of Cannonfiles to provision on this chain. It can be the `name` field for your protocol or the name of a package from the [registry](/search). The items in the array can also be arrays with a length of two, where the first item is the name of the package to use and the second item is an object with options to use when running this Cannonfile.
  * `port` *<small>integer</small>* - Optionally, specify a port use for this node.

## cannonfile.toml Specification

Cannonfiles contain a series of actions which are executed at run-time. See [Create cannonfile.toml](##create-cannonfiletoml) for example usage. **Specify a `step` for each action used to ensure the execution occurs in the correct order.**

Each action has a type and a name. Each type accepts a specific set of inputs and generates outputs. The outputs are accessible by actions executed at a later step by referencing the action’s name, and by other cannonfiles which `import` it.

For example, the action below has the type `contract` and is named `myStorage`. It requires the input `artifact`, which is the name of the contract to deploy. (In this example, it’s the contract named `Storage`.)

```toml
[contract.myStorage]
artifact = "Storage"
step = 0
```

When specifying inputs, you can use outputs from actions in previous steps (including those from imported cannonfiles). Outputs are namespaced under a pluralized version of the action type, followed by the name of the action. For example, you could reference the address where the above `Storage` contract is deployed with `<%= contracts.myStorage.address %>`.

### contract

The `contract` action deploys a contract.

**Required Inputs**
* `artifact` - Specifies the name of the contract to be deployed

**Optional Inputs**
* `args` - Specifies the arguments to provide the constructor function
* `libraries` - An array of contract action names that deploy libraries this contract depends on.

**Outputs**
* `abi` - The ABI of the deployed contract
* `address` - The address fo the deployed contract
* `deployTxnHash` - The transaction hash of the deployment

### import

The `import` action will import a cannonfile from a package hosted with the package manager. **Third-party packages can execute arbitrary code when imported. Only import packages that you trust.**

**Required Inputs**
* `source` - The name of the package to import

**Optional Inputs**
* `options` - The options to be used when initializing this cannonfile

**Outputs**
The outputs of the imported cannonfile are provided under the namespace of the import action. For example, if a package is imported with `[import.uniswap]` and its cannonfile deploys a contract with `[contract.pair]` which outputs `address`, this address would be accessible at `<%= imports.uniswap.contracts.pair.address %>`.

### run

The `run` action executes a custom script.

**Required Inputs**
* `exec` - The javascript (or typescript) file to load
* `func` - The function to call in this file

**Optional Inputs**
* `args` - The arguments to pass the script
* `env` - Environment variables to be set on the script
* `modified` - An array of files and directories that this script depends on. The cache of the cannonfile's build is recreated when these files change.

**Outputs**
If the script returns a JSON object, it will be provided as the output. For example, if a script is run with `[run.custom_deploy]` and the function specified returns `{"exampleKey": "myDynamicOutput"}`, *myDynamicOutput* would be accessible at `<%= runs.custom_deploy.exampleKey %>`.

### invoke

The `invoke` action calls a specified function on your node.

**Required Inputs**
* `target` - The name of the contract action that deployed the contract to call or the address of the contract. If the contract was deployed from an imported package, it will be namespaced under the import action’s name using dot notation. For example, if a package were imported with `[import.uniswap]` and this package's cannonfile deploys a contract with `[contract.pair]`, you could call could call a function on this contract by passing `["uniswap.pair"]` into this input.
* `abi` - The ABI of the contract to call. This is optional if the target contains a contract action name rather than an address.
* `func` - The name of the function to call

**Optional Inputs**
* `args` - The arguments to use when invoking this call
* `from` - The calling address to use when invoking this call
* `factory` - See *Referencing Factory-deployed Contracts* below.

**Outputs**
* `hash` - The transaction hash of the execution

#### Referencing Factory-deployed Contracts

Smart contracts may have functions which deploy other smart contracts. Contracts which deploy others are typically referred to as factory contracts. You can reference contracts deployed by factories in your cannonfile.

For example, if the `deployPool` function below deploys a contract, the following invoke command registers that contract based on event data emitted from that call.

```toml
[invoke.deployment]
target = "PoolFactory"
func = "deployPool"
factory.MyPoolDeployment.artifact = "Pool"
factory.MyPoolDeployment.event = "NewDeployment"
factory.MyPoolDeployment.arg = 0
```

Specifically, this would anticipate this invoke call will emit an event named *NewDeployment* with a contract address as the first data argument (per `arg`, a zero-based index). This contract should implement the `Pool` contract. Now, a subsequent `invoke` step could set `target = "MyPoolDeployment"`.

If the invoke call has target set to an array and/or there are multiple events emitted, you can specify them by index. For example `"factory.MyDeployment.2.event.4"` would reference the third item in the array passed to target, and the fifth time the specified event is emitted.