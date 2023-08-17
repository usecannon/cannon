## What is it?

Cannon is a smart contract deployment tool and package manager. It draws inspiration from Terraform, Docker, and npm. Users define **Cannonfiles**, which specify a desired state of a blockchain (local, testnet, or mainnet). For example, you might want to _deploy_ a smart contract and _invoke_ a function on it to set some configuration. You can also _import_ packages to connect your protocol to an existing protocol.

Then, you can use Cannon to **build** a blockchain into the state specified by the Cannonfile. This process works the same for local development, testnets, forks, and mainnet deployments. Deployments can be shared as packages via the decentralized package manager.

There are many different use cases for Cannon:

- **Front-end Development** - Developers can easily download a package, run it on a local node, and retrieve the addresses and ABIs. When it's ready for production, the front-end application can simply use the addresses from the package which correspond to the user's network.
- **Smart Contract Development** - Developers can set up environments with all of their smart contracts configured however they’d like and also import other packages for integrations.
- **QA/Testing** - Development builds can be used and inspected prior to deployment to ensure implementations are accurate and robust.
- **Protocol Deployment, Upgrades, and Configuration** - When smart contracts are ready for deployment (or upgrade), the same Cannonfiles used in development and testing can be built on remote networks.
- **Continuous Integration** - Testing pipelines can rely on Cannon to create nodes for integration and E2E tests.
- **GitOps** - Cannonfiles can be managed in git such that an organization can maintain a clear 'source of truth' for the deployment state.

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

```
{
  defaultNetwork: "cannon"
}
```

Now you’ll be able to use the Hardhat plug-in commands specified in the [Cannon Commands](#cannon-commands) section below.
