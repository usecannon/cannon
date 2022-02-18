# Cannon Documentation

Cannon is a [Hardhat](https://hardhat.org/]) plug-in that allows you to configure your protocol's scripts, keepers, and on-chain dependencies for automated provisioning and deployment. It is inspired by [Docker](https://www.docker.com/) and [Terraform](https://www.terraform.io/).

You can use Cannon by specifying a package you'd like to deploy on a local node. This command can be used instead of `npx hardhat node`.

For more advanced usage, you can set up either of both of the following files:
* **`cannon.json`** - This file defines the chains where you'll deploy your smart contracts and your dependencies on those chains.
* **`cannonfile.toml`** - This file defines the scripts that should be executed and configurations relevant to your smart contracts.

## Getting Started

### Install Cannon

After you've installed Hardhat, install `hardhat-cannon`.
```
npm install hardhat-cannon
```

### Update Your Hardhat Configuration

Include Cannon at the top of your `hardhat.config.js`.
```js
require('hardhat-cannon');
```

If your project uses Typescript, include Cannon in `hardhat.config.ts`.
```ts
import 'hardhat-cannon';
```

### Provision a Custom Chain

If you'd like to run a local node with an existing protocol, you can rely on the built-in package manager.

For example, the following command will start a local node (similar to running `npx hardhat node`) with a simple `Greeter.sol` contract already deployed.
```bash
npx hardhat cannon greeter 
```

If you'd like to customize this deployment, you can specify options.
```bash
npx hardhat cannon greeter msg="Hello from Cannon"
```

Review the a package's README for more information on the options available and other usage instructions.

### Create cannon.json

The example above is great for simple scenarios, but if your protocol depends on multiple protocols or multiple chains, then you can create a `cannon.json` file in the same directory as your `hardhat.config.js`.

Here's an example. 
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
            "chainId": 10
        },
        {
            "deploy": [
              "mySampleProject:latest",
              "synthetix:2.62"
            ],
            "chainId": 100
        }
    ]
}
```

Once you've created your `cannon.json` file, run `npx hardhat cannon` and Cannon will use the configuration defined in this file.

See [cannon.json Specification](#cannonjson-specification) for more details on how to set up this file.

### Define a Cannonfile

If you'd like to automate your own deployments, add a `cannonfile.toml` file in the same directory as your `hardhat.config.js`.

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
tags = ["example","fun"]

[setting.initialValue] # Create an overridable setting
defaultValue = "420" # This is the value to use if none is specified when the function is invoked.

[contract.myStorage] # Declares an action, the output of which to be referenced below as outputs.self.contracts.myStorage
artifact = "Storage" # Specifies the name of the contract to be deployed
step = 0 # Ensure this action is taken first

[invoke.changeStorage] # Declares an action to set the initial value
address = "<%= outputs.self.contracts.myStorage.address %>" # Sets the address of the contract to invoke
abi = "<%= outputs.self.contracts.myStorage.abi %>" # Sets the abi of the contract to invoke
func = "store" # Sets the name of the function to invoke
args = ["<%= settings.initialValue %>"] # Sets the list of arguments to pass to the function
step = 1 # Ensure this action is taken after the previous action
```

Then build and run your Cannonfile: 
```bash
npx hardhat compile
npx hardhat cannon:build myStorageCannon
npx hardhat cannon myStorageCannon initialValue="69"
```

*Note that you could simplify the example above by removing the dynamic option. This would entail removing the `[setting.initialValue]` section and set args with `args=["69"]`*

See [cannonfile.toml Specification](#cannonfiletoml-specification) for more details on how to set up this file.

## Using the Package Manager

The examples above demonstrate how to read from the package manager using a `canon.json` file or via the CLI.

Here is an example of how you could publish the above Cannonfile to the registery, backed on Ethereum and IPFS:
```
npx hardhat compile
npx hardhat cannon:build myStorageCannon:latest
npx hardhat cannon:publish myStorageCannon
```

## cannonfile.toml Specification

_Coming soon_
Check builder folder

## cannon.json Specification

_Coming soon_
same as above

items in deploy can be an array with length 2, where the second item is an object containing options (like initialValue: 42)

can specify port number
port: after chainId
