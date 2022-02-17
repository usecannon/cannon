# Cannon Documentation

Cannon is a [Hardhat](https://hardhat.org/]) plug-in that ___

Using Cannon involves configuring two files:
* **`cannon.json`** - This file ____.
* **`deploy.toml`** - This file ____.

## Getting Started

### Install Cannon

After you've installed Hardhat, install `hardhat-cannon`.
```
npm install hardhat-cannon
```

### Update Your Hardhat Configuration

Include this line at the top of your `hardhat.config.js`.
```js
require('hardhat-cannon');
```

### Define a cannon.json file

Add a `cannon.json` file in the same directory as your `hardhat.config.js`. 

Here's an
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
            "deploy": ["synthetix:2.62"],
            "chainId": 100
        }
    ]
}
```

Do we need to explain the package manager here?

See specification section below.

### Define a deploy.toml file

Optionally, you can include a `deploy.toml` file. This is ___.

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

