# Cannon

This is the monorepo for the Cannon Hardhat plugin. If you’re just interested in using the project, [visit the website](https://usecannon.com).

For more information, please see documentation in the modules listed below:

- [`cli`](packages/cli): Source code for the CLI, accessible at `npx @usecannon/cli <package:version>`. This downloads a package from the registry, optionally exports deployment data, and runs the package on an [Anvil](https://github.com/foundry-rs/foundry/tree/master/anvil) node
- [`hardhat-cannon`](packages/hardhat-cannon): Main plugin module which is imported into packages
- [`registry`](packages/registry): Contains source and deployment code for the IPFS registry
- [`registry-subgraph`](packages/registry-subgraph): Indexes the registry contract onto The Graph for display on the website explorer
- [`sample-project`](packages/sample-project): Demonstrates the core functionality of the `hardhat-cannon` module
- [`contracts`](packages/contracts): Cannonfiles for standard contracts
- [`website`](packages/website): Source code for https://usecannon.com
- [`builder`](packages/builder): Contains source code that builds chain data from cannonfiles

## Development

Start by bootstrapping the project from the root directory:

```
npx lerna bootstrap
```

After making changes, rebuild the project:

```
npm run build
```

Use the development version of the CLI:

```
cd ./packages/cli && npm start -- <package:version>
```

Test changes to the Hardhat plug-in in the sample project:

```
cd ./packages/sample-project && npx hardhat cannon
```
