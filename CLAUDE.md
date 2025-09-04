# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cannon is a DevOps tool for EVM chains designed for testing, deploying, and publishing smart contracts. This is a monorepo structured around a core builder engine with multiple packages and applications.

## Common Commands

### Development Setup
- `pnpm i` - Install all dependencies (requires Node.js ≥18 and pnpm ≥9)
- `pnpm build` - Build core packages (@usecannon/builder, @usecannon/cli, hardhat-cannon, @usecannon/api)
- `pnpm build:website` - Build website and dependencies
- `pnpm watch` - Watch mode for builder and CLI packages
- `pnpm clean` - Clean all dist folders

### Testing and Quality
- `pnpm test` - Run all package tests (excludes @usecannon/repo)
- `pnpm lint` - Run both JavaScript and Solidity linting
- `pnpm lint:js` - Lint TypeScript/JavaScript files with eslint
- `pnpm lint:sol` - Lint Solidity files with solhint
- `pnpm lint:fix` - Auto-fix linting issues for both JS and Solidity

### Package Management
- `pnpm version` - Bump versions using Lerna
- `pnpm publish` - Publish packages using Lerna
- `pnpm publish-alpha` - Publish alpha versions
- `pnpm changeset` - Create changeset for version management

### CLI Development
- `cd ./packages/cli && pnpm start -- <package:version>` - Run development version of CLI
- `cd ./examples/sample-hardhat-project && pnpm hardhat cannon:build` - Test Hardhat plugin
- `cd ./packages/website && pnpm dev` - Run website locally

### Cannon CLI Usage
- `cannon --version` - Check CLI version
- `cannon build` - Build cannonfile locally (uses cannonfile.toml by default)
- `cannon build --keep-alive` - Build and keep node running for interaction
- `cannon run <package:version>` - Run a built package locally
- `cannon test` - Build cannonfile and run forge tests with deployment context
- `cannon fetch <ipfs-hash> [package:version]` - Fetch package data from IPFS (auto-detects package name)
- `cannon publish <package:version> --chain-id <id>` - Publish package to registry
- `cannon verify <package:version>` - Verify contracts on Etherscan
- `cannon inspect <package:version>` - Inspect package deployment data
- `cannon clean` - Clean local cannon data

### Package-specific Commands
Each package has its own scripts:
- CLI: `pnpm test`, `pnpm test-e2e`, `pnpm build`, `pnpm watch`
- Builder: `pnpm test`, `pnpm build:node`, `pnpm build:browser`, `pnpm watch`
- Website: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm e2e`

### Testing Individual Packages
- Navigate to specific package directory and run `pnpm test`
- For end-to-end tests in CLI: `pnpm test-e2e`
- For website e2e tests: `pnpm e2e` or `pnpm e2e:headless`

## Architecture

### Core Packages
- **@usecannon/builder** - Core engine that processes cannonfiles and builds chain data
- **@usecannon/cli** - Command-line interface providing cannon commands
- **hardhat-cannon** - Hardhat plugin wrapping CLI with project defaults
- **@usecannon/api** - Backend API for the website
- **@usecannon/website** - Next.js website at usecannon.com
- **@usecannon/registry** - Smart contracts for the package registry
- **@usecannon/repo** - IPFS hosting service backend
- **@usecannon/indexer** - Redis-based data processor for the website

### Key Concepts
- **Cannonfiles** (cannonfile.toml) - TOML configuration files defining deployment workflows with actions like `deploy`, `invoke`, `var`
- **Chain Builder Runtime** - Executes deployment steps against blockchain networks, handling dependencies automatically
- **Package Registry** - On-chain smart contract registry for published packages (OP Mainnet & Ethereum Mainnet)
- **IPFS Storage** - Decentralized storage for package artifacts, deployment data, and metadata
- **Templates** - Variable substitution system using `<%= %>` syntax for dynamic configuration
- **Actions** - Building blocks in cannonfiles: `deploy` (contracts), `invoke` (function calls), `var` (settings), etc.
- **Presets** - Different configurations of the same package (default is "main")
- **cannon-std** - Foundry library for accessing deployment data in tests via `vm.getAddress()`

### Workspace Structure
```
packages/
├── builder/        # Core deployment engine
├── cli/           # Command-line interface
├── hardhat-cannon/ # Hardhat integration
├── api/           # Website backend
├── website/       # Frontend application
├── registry/      # Registry smart contracts
├── repo/          # IPFS service
└── indexer/       # Data processing
examples/          # Sample projects and usage demos
```

## Code Standards

### Commit Conventions
- Follow ConventionalCommits format: `<type>(scope): <subject>`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Scopes: `builder`, `cli`, `hardhat-cannon`, `api`, `website`, `registry`
- Breaking changes: Use `!` suffix (e.g., `feat!:`, `fix!:`)

### Code Style
- Google's TypeScript Style Guide for TypeScript code
- All features must be tested with unit tests
- Public APIs and CLI commands must be documented
- Use pnpm workspaces for package management

### Dependencies
- Main runtime: Node.js ≥18, pnpm ≥9
- Key libraries: viem (Ethereum), commander (CLI), Next.js (website)
- Testing: Jest for unit tests, Cypress for e2e tests
- Build tools: TypeScript, Rollup, Lerna

## Cannon Workflow Overview

### Typical Development Flow
1. **Setup**: Install Foundry and Cannon CLI (`npm install -g @usecannon/cli`)
2. **Create Project**: `forge init` + create `cannonfile.toml`
3. **Build**: `cannon build` compiles contracts and executes deployment locally
4. **Test**: `cannon test` runs forge tests with deployment context using cannon-std
5. **Deploy**: `cannon build --rpc-url <url> --private-key <key>` for live networks
6. **Publish**: `cannon publish <name:version> --chain-id <id>` to share with others
7. **Fetch**: `cannon fetch <ipfs-hash>` to download and use published packages

### Cannonfile Structure
```toml
name = "my-protocol"
version = "1.0.0"
description = "My protocol description"

[var.Settings]
initialValue = "42"

[deploy.MyContract] 
artifact = "MyContract"
args = ["<%= settings.initialValue %>"]

[invoke.Initialize]
target = ["MyContract"]
func = "initialize"
args = []
```

### Common Patterns
- Use `settings.*` variables for configurable parameters
- Reference deployed contracts via `contracts.<name>.address`
- Access transaction data with `contracts.<name>.deployTxnHash`
- Chain actions using template interpolation for dependencies
- Add `privateSourceCode = true` to exclude source from published packages

### Fetching Packages
The `cannon fetch` command downloads package data from IPFS and stores it locally:

```bash
# Auto-detect package name from IPFS data (recommended)
cannon fetch ipfs://QmTK6qhaBAxwRTmFVejHyKyVeAzibxeWdJ1j3LXVj98eej --chain-id 1

# Or specify package name explicitly for validation
cannon fetch ipfs://QmTK6qhaBAxwRTmFVejHyKyVeAzibxeWdJ1j3LXVj98eej synthetix-omnibus:3.10.1 --chain-id 1

# Use the fetched package
cannon run synthetix-omnibus:3.10.1 --chain-id 1
```

**When to use `cannon fetch`:**
- Download published packages from IPFS to use locally
- Share package deployments across teams using IPFS hashes
- Access packages that aren't published to the on-chain registry
- Work with packages in development or testing environments

## Development Notes

- Use `pnpm` exclusively (enforced by preinstall hook)
- Packages use workspace protocol for internal dependencies
- Builder supports both Node.js and browser environments via Rollup
- CLI includes extensive e2e tests using Bats framework
- Website uses contentlayer for documentation processing
- Registry contracts support both Ethereum mainnet and Optimism
- Default chain ID for local development is 13370
- Cannon automatically manages action execution order based on dependencies
- Testing requires `forge install usecannon/cannon-std` for deployment context