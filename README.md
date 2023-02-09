# Cannon

This is the monorepo for Cannon. If you’re just interested in using the project, [visit the website](https://usecannon.com).

**⚠️ Cannon is under active development. While the interface and functionality are generally stable, use the tool with caution when conducting high-risk deployments.**

For more information, please see documentation in the modules listed below:

- [`cli`](packages/cli): The command-line interface. Run `npx @usecannon/cli --help` for usage information.
- [`builder`](packages/builder): Builds chain data from cannonfiles. (This is used by the CLI.)
- [`hardhat-cannon`](packages/hardhat-cannon): Code for the Hardhat plug-in, which wraps the CLI functionality with defaults pulled from a Hardhat project configuration.
- [`registry`](packages/registry): The smart contract for the package registry.
- [`registry-subgraph`](packages/registry-subgraph): Indexes the registry contract onto The Graph for display on the website.
- [`website`](packages/website): The website, hosted at https://usecannon.com
- [`sample-hardhat-project`](packages/sample-hardhat-project): Hardhat project that demonstrates the core functionality of the `hardhat-cannon` module
- [`sample-foundry-project`](packages/sample-hardhat-project): Foundry project that demonstrates the core functionality of the `cli` module
- [`contracts`](packages/contracts): Cannonfiles for standard contracts

## Development

Community contributions to Cannon are greatly appreciated. Please open pull requests, issues, and discussions in the GitHub repository.

To load a development version of Cannon, start by bootstrapping the project from the root directory:

```
npx lerna bootstrap
npm i
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
cd ./packages/sample-hardhat-project && npx hardhat cannon:build
```

Preview updates to the website

```
cd ./packages/website && npm run dev
```

### Publishing

With appropriate permissions on npm, publish updates using the [lerna publish](https://github.com/lerna/lerna/tree/main/commands/publish) command. For example, `npx lerna publish patch` will publish updated packages as the next patch version.

## License

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

This project is licensed under the terms of the GNU General Public License v3.0, except for the code available in `packages/contracts` which is licensed under the terms of the MIT License.

Copyright (C) 2023 Daniel Beal, Noah Litvin, Matías Lescano
