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

## Development

Community contributions to Cannon are greatly appreciated. Please open pull requests, issues, and discussions in the GitHub repository.

To load a development version of Cannon, start by installing the dependencies from the root directory:

```
npm ci
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

### Contribution Guidelines

See [CONTRIBUTING.md](./CONTRIBUTING.md)

### Publishing

Currently our [release workflow](.github/workflows/release-please.yml) handles publishing releases to npm through lerna.
It only publishes releases if any SemVer version changes have been added to the commit history merged into main.

If a situation where a commit was merged without proper convention arises, we can always bump and publish manually using lerna's [version and publish](https://lerna.js.org/docs/features/version-and-publish) workflow:

 `npx lerna publish --no-private` will bump package versions and find npm packages that need to be published in the repo.

## License

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

This project is licensed under the terms of the GNU General Public License v3.0.

Copyright (C) 2023 Daniel Beal, Noah Litvin, Matías Lescano
