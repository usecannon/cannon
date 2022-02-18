# Cannon Documentation

Cannon is a [Hardhat](https://hardhat.org/]) plug-in that allows you to configure your protocol's scripts, keepers, and on-chain dependencies for automated deployment. It is inspired by [Docker](https://www.docker.com/) and [Terraform](https://www.terraform.io/).

Using Cannon involves configuring two files: (one,the other or both)
* **`cannon.json`** - This file defines the chains where you'll deploy your smart contracts and your dependencies on those chains.
* **`cannonfile.toml`** - This file defines the configuration and scripts that should be executed when deploying your protocol.

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

If your project uses Typescript, include Canon in `hardhat.config.ts`.
```ts
import 'hardhat-cannon';
```

### Provision a Custom Chain

If you'd like to run a local node with an existing protocol, you can rely on the built-in package manager. For example, the following command will start a local node (similar to running `npx hardhat node`) with a simple `Greeter.sol` contract already deployed.

```
npx hardhat cannon greeter 
```

If you'd like to customize this deployment, you can specify options.

```
npx hardhat cannon greeter msg="Something cute here"
```

Review the README for a given package to see the full list of options.

### Define cannon.json

Above example is good for quick prototyping, but if you need multiple protocols and multiple chains, then you need a canon.json file

Add a `cannon.json` file in the same directory as your `hardhat.config.js`. At minimum, you only need to define a name and a single chain where it would be deployed. You can also specify other protocols, imported from the package manager.

Here's an example. 
```json
{
    "name": "mySampleProject:latest",
    "chains": [
        {
            "deploy": [
              "mySampleProject:latest",
              "synthetix:2.60",
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

See [cannon.json Specification](#canonjson-specification) and [Using the Package Manager](#using-the-package-manager) for more information.

Once you've created your `cannon.json` file, run `npx hardhat canon` to provision a node (or multiple).

### Define a Cannonfile

If you'd like to automate your own deployments, you can include a cannonfile. Your cannonfile can be uploaded to the package registry.

Add a `canonfile.toml` file in the same directory as your `hardhat.config.js`.

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
defaultValue = "42" # This is the value to use if none is specified when the function is invoked.

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

args could just be args=["42"]

build with 
```
npx hardhat compile
npx hardhat cannon:build myStorageCannon
```

now you can run with
```
npx hardhat cannon myStorageCannon initialValue="24"
``

See specification section below for all of the 


## Using the Package Manager

The examples above demonstrate how to read from the package manager.

If you'd like to publish you cannonfile,

```
npx hardhat compile
npx hardhat cannon:build myStorageCannon:latest
npx hardhat cannon:publish myStorageCannon
```

use your own contract name instead of myStorageCannon

## cannonfile.toml Specification

_Coming soon_
Check builder folder

## canon.json Specification

_Coming soon_
same as above

items in deploy can be an array with length 2, where the second item is an object containing options (like initialValue: 42)

can specify port number
port: after chainId
