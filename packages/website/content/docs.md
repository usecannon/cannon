# Cannon Documentation

Cannon is a [Hardhat](https://hardhat.org/]) plug-in that allows you to configure your protocol's scripts, keepers, and on-chain dependencies for automated deployment. It is inspired by [Docker](https://www.docker.com/) and [Terraform](https://www.terraform.io/).

Using Cannon involves configuring two files:
* **`cannon.json`** - This file defines the chains where you'll deploy your smart contracts as well as your dependencies on those chains.
* **`deploy.toml`** - This file defines the configuration and scripts that should be executed when deploying your protocol.

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

### Define a cannon.json file

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

### Define a deploy.toml file

Optionally, you can include a `deploy.toml` file.

Add a `deploy.toml` file in the same directory as your `hardhat.config.js`.

For example: 
```toml
...
```

See specification section below.

## Using the Package Manager

Cannon comes with a built-in package manager... 

## canon.json Specification

_Coming soon_

## deploy.toml Specification

_Coming soon_

