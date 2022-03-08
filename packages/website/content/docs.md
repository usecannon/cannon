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
defaultValue = "420" # This is the value to use if none is specified when the function is invoked.

[contract.myStorage] # Declares an action, the output of which to be referenced below as outputs.self.contracts.myStorage
artifact = "Storage" # Specifies the name of the contract to be deployed
step = 0 # Ensure this action is taken first

[invoke.changeStorage] # Declares an action to set the initial value
addresses = ["<%= outputs.self.contracts.myStorage.address %>"] # Sets the address of the contract to invoke
abi = "<%= outputs.self.contracts.myStorage.abi %>" # Sets the abi of the contract to invoke
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

**Coming soon**

Make sure `detect` is set in `cannonfile.toml` for all your on-chain dependencies.

Then run
```bash
npx hardhat --network <network name> cannon:build
```

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

### contract

The `contract` action deploys a contract to a chain.

**Required Inputs**
* `artifact` - Specifies the name of the contract to be deployed

**Optional Inputs**
* `args` - Specifies the arguments to provide the constructor function
* `detect` - *Coming soon.* When deploying to a live network, this specifies the address of the live version of this contract

**Outputs**
* `abi` - The ABI of the deployed contract
* `address` - The address fo the deployed contract
* `deployTxnHash` - The transaction hash of the deployment

### import

The `import` action allows for composability by letting you specify another cannonfile to be built on your chain.

**Required Inputs**
* `source` - The name of the package to import

**Optional Inputs**
* `options` - The options to be used when initializing this cannonfile

**Outputs**
The outputs of the imported cannonfile are provided under the namespace of the import action. For example, if a uniswap cannonfile imported as `uniswap_eth_snx` has a contract `pair` which outputs `address`, it would be accessible at `outputs.uniswap_eth_snx.contracts.pair.address`. Any output from the current module comes out of `outputs.self.*` following the same pattern as other modules.

### invoke

The `invoke` action calls a specified function on-chain.

**Required Inputs**
* `addresses` - List of all addresses for which the same call should be executed
* `abi` - The ABI of the contract to call
* `func` - The name of the function to call

**Optional Inputs**
* `args` - The arguments to use when invoking this call
* `from` - The calling address to use when invoking this call
* `detect` - *Coming soon.* When deploying to a live network, this specifies the address of the live version of this contract

**Outputs**
* `hash` - The transaction hash of the execution

### keeper

The `keeper` action defines a keeper to be used on this chain. This does not effect the chain build.

*Coming soon.*

### run

The `run` action executes a custom script.

**Required Inputs**
* `exec` - The javascript (or typescript) file to load
* `func` - The function to call in this file

**Optional Inputs**
* `args` - The arguments to pass the script
* `env` - Environment variables to be set on the script

**Outputs**
If the script returns a JSON object, the outputs of this action will consist of those values as key-value pairs.
