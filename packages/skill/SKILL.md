---
name: cannon
description: Cannon package manager for Ethereum deployments. Use when building, testing, deploying, or inspecting Cannon packages. Covers cannonfile syntax, CLI commands (build, run, test, publish, inspect), actions (deploy, invoke, clone, pull, router, diamond), and package workflows. NOT for general Solidity development questions.
---

# Cannon

## ⚠️ CRITICAL: Read This First

**Some Cannon commands are IRREVERSIBLE and handle real value.** Be careful with:

- `cannon build` (without `--dry-run`) — deploys contracts on real networks
- `cannon publish` — publishes to on-chain registry (permanent)
- `cannon register` — registers package names on-chain
- `cannon publishers` — manages package publisher permissions

Safe commands: `cannon build --dry-run`, `cannon inspect`, `cannon run`, `cannon test`, `cannon decode`, `cannon trace`, `cannon clean`

Rules:
1. **Always use `--dry-run` first** — Simulate before executing on real networks
2. **Make every operation clear to the user** — Explain what will happen before running
3. **Confirm before deploying** — Never use a real private key without explicit approval
4. **Test locally first** — Use chain 13370 (Cannon Network) before target chains
5. **Protect private keys** — Use `CANNON_PRIVATE_KEY` env var or `--impersonate` (recommended)

## Model Recommendation

**Use state-of-the-art models for Cannon tasks.** Deployment scripts handle real value — don't skimp on model quality. Prefer Claude, GPT-4, or equivalent high-capability models over cheaper alternatives.

## Schema Reference

For complete cannonfile syntax validation and autocomplete, refer to the official JSON schemas:

- **Full schema:** https://raw.githubusercontent.com/usecannon/cannon/refs/heads/dev/packages/lsp/src/schema.json
- **Fragment schema:** https://raw.githubusercontent.com/usecannon/cannon/refs/heads/dev/packages/lsp/src/schema-fragment.json

For editor validation, add the schema reference at the top of your `cannonfile.toml`:

```toml
#:schema https://raw.githubusercontent.com/usecannon/cannon/refs/heads/dev/packages/lsp/src/schema.json

name = "my-package"
version = "1.0.0"
...
```

This enables autocomplete and validation in editors with TOML LSP support (like taplo).

---

Cannon is a package manager and deployment system for Ethereum smart contracts. It uses declarative cannonfiles to define deployment workflows and supports both local development and on-chain deployments.

## Prerequisites

Before using this skill, ensure these tools are installed:

- **Node.js 18+** and **pnpm** - `npm install -g pnpm`
- **Foundry** (forge, anvil, cast) - `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- **Cannon CLI** - `pnpm add -g @usecannon/cli`

Verify installation:
```bash
node --version && pnpm --version
forge --version && anvil --version
cannon --version
```

## Quick Reference

For complete CLI options, see [references/cli.md](references/cli.md).

### CLI Commands
```bash
cannon build              # Build package locally (starts anvil, deploys contracts)
cannon run <pkg:ver>      # Run a deployed package (shorthand: cannon <pkg:ver>)
cannon test               # Run forge tests with deployment context
cannon inspect <pkg:ver>  # View package details
cannon publish            # Publish to on-chain registry + IPFS ⚠️ IRREVERSIBLE
cannon clean              # Delete cache directories
cannon verify             # Verify contracts on Etherscan/Sourcify
```

### Package Reference Format
```
<package-name>:<version>@<preset>
```
Examples:
- `greeter-foundry:2.24.0`
- `safe:1.4.1`
- `synthetix-omnibus:3.1.4@main`

## Cannonfile Syntax

### Package Metadata & Includes
```toml
name = "my-package"
version = "1.0.0"
description = "My package description"
tags = ["defi", "token"]
preset = "main"

# Include additional files containing actions (for larger packages)
include = ["./deposits.toml", "./withdrawals.toml"]
```

Use `include` to split large cannonfiles into multiple files. Included files use the fragment schema and can contain any actions (deploy, invoke, clone, etc.).

Modern syntax uses `[var.label]` for settings (deprecated: `[setting.name]`).

### Variables
```toml
[var.chainId]
defaultValue = 1

[var.owner]
defaultValue = "0x..."
```

### Deploy Contract
```toml
[deploy.MyContract]
artifact = "MyContract"
args = ["<%= settings.owner %>"]
```

### Invoke Function
```toml
[invoke.initialize]
target = ["<%= contracts.MyContract.address %>"]
func = "initialize"
args = ["<%= settings.owner %>"]
```

### Import/Clone Package
```toml
[clone.safe]
source = "safe:1.4.1"
target = "safe"
```

**When to use clone vs import:**
- **`clone`** — Use another package as a "blueprint" to deploy it anew. Always set `target` appropriately (same as source if you own it, or a new name if not).
- **`import`** — Pull in data from an already-deployed package without re-deploying.

### Pull Data from Package
```toml
[pull.usdc]
source = "usdc:1.0.0@main"
```

Access: `<%= imports.usdc.contracts.USDC.address %>`

## Template Strings

Use ERB-style templates to reference values:
- `<%= settings.varName %>` — settings
- `<%= contracts.ContractName.address %>` — deployed contract address
- `<%= contracts.ContractName.abi %>` — contract ABI
- `<%= imports.pkg.contracts.Contract.address %>` — imported contract

## Actions

| Action | Description |
|--------|-------------|
| `deploy` | Deploy a contract |
| `invoke` | Call a contract function |
| `clone` | Deploy another package as a blueprint |
| `import` | Pull data from an already-deployed package |
| `pull` | (deprecated) Alias for import |
| `var` | Define computed variables |
| `router` | Create a router contract to bypass size limits (pairs well with UUPS proxy) |
| `diamond` | Create an EIP-2535 Diamond with facets |

## Local Development

**⚠️ Always use chain 13370 (Cannon Network) for local testing before deploying to target chains.**

Default chain ID: **13370** (Cannon Network)

```bash
# Build with local anvil
cannon build

# Build for specific chain
cannon build --chain-id 1 --rpc-url $RPC_URL

# Dry run (simulation only)
cannon build --dry-run --impersonate-all

# Run a package locally
cannon run greeter-foundry:2.24.0
```

## On-Chain Deployment

**⚠️ Always use `--dry-run` first to verify deployments before executing on real networks.**

```bash
# Deploy to mainnet
cannon build --chain-id 1 --rpc-url $RPC_URL --private-key $KEY

# Publish to registry
cannon publish --chain-id 1 --rpc-url $RPC_URL --private-key $KEY

# For simulation before actual deploy
cannon build --chain-id 1 --rpc-url $RPC_URL --dry-run
```

## Testing

```bash
# Run tests with forge
cannon test

# Test specific contract
cannon test --match-path "test/MyContract.t.sol"
```

Use `cannon-std` in Forge tests:
```solidity
import {Cannon} from "cannon-std/Test.sol";

contract MyTest is Cannon {
    function setUp() public {
        // Load deployed contracts
        address myContract = getAddress("MyContract");
    }
}
```

## Storage Locations

| Directory | Contents |
|-----------|----------|
| `~/.local/share/cannon/tags/` | Package reference files |
| `~/.local/share/cannon/ipfs_cache/` | Cached IPFS artifacts |
| `~/.local/share/cannon/build_results/` | Build outputs |
| `~/.local/share/cannon/blobs/` | Large binary blobs |

## Common Patterns

### Router Pattern (Bypass Contract Size Limits)
Create a router contract that efficiently passes calls to downstream contracts. Powerful when combined with a UUPS proxy.

```toml
[deploy.CoreImplementation]
artifact = "Core"

[deploy.AnotherImplementation]
artifact = "Another"

[router.CoreRouter]
dependencies = ["CoreImplementation", "AnotherImplementation"]
```

### Diamond Pattern (EIP-2535)
```toml
[deploy.Diamond]
artifact = "Diamond"

[deploy.FacetA]
artifact = "FacetA"

[deploy.FacetB]
artifact = "FacetB"

[diamond.Diamond]
facets = ["FacetA", "FacetB"]
```

### Linked Libraries
```toml
[deploy.Library]
artifact = "Library"

[deploy.Contract]
artifact = "Contract"
libraries = { Library = "<%= contracts.Library.address %>" }
```

## Debugging Tools

Cannon provides commands to decode bytecode, trace transactions, and interact with deployed contracts.

### Decode
Decode hex data (function calls, events, errors) using package ABIs:
```bash
cannon decode synthetix-omnibus --chain-id 8453 --preset main 0x...
```

### Trace
Get human-readable stack traces for transactions:
```bash
cannon trace <tx-hash> --chain-id 1 --rpc-url $RPC_URL
```

### Interact
Send transactions to deployed contracts through the CLI:
```bash
cannon interact synthetix-omnibus --chain-id 8453 --contract CoreProxy
```

## Package State Manipulation (`alter`)

The `alter` command modifies existing Cannon packages outside the regular build process. Use for troubleshooting, migrations, or fixing broken package state.

⚠️ **Only use `alter` when no other option exists.**

### Subcommands

| Command | Description |
|---------|-------------|
| `import` | Import existing artifacts into a deployment step (for migrations) |
| `set-contract-address` | Change a contract's address in the deployment |
| `mark-complete` | Mark a deployment step as complete |
| `mark-incomplete` | Mark a deployment step as incomplete |
| `set-url` | Update the deployment URL reference |
| `set-misc` | Update miscellaneous data URL |
| `clean-unused` | Remove unused deployment states |
| `migrate-212` | Migrate packages from version 2.12 format |

### Example: Import existing deployment
```bash
# Import a deployed contract by its creation transaction
cannon alter my-package:1.0.0 --chain-id 1 import deploy MyContract 0x...txhash

# Import an executed transaction
cannon alter my-package:1.0.0 --chain-id 1 import invoke initialize 0x...txhash
```

## GitOps Workflows

Cannon supports GitOps-style deployments through the website interface.

### Queue with GitOps
Deploy packages directly from GitHub repositories or IPFS hashes via the Cannon website:
- Preview transactions before execution
- View Git Diff of changes
- Execute through Safe multisig wallets
- Publish to registry after deployment

See: https://usecannon.com/deploy

### Deployments Repository
Create a dedicated Git repository for deployment configurations (separate from source code):
- Keep smart contract source private while maintaining transparent deployments
- Enable team collaboration on deployments
- Maintain clear audit trail

## Migration from Other Tools

Migrating from hardhat-deploy, Foundry scripts, or other deployment frameworks:

1. **Recreate deployment as cannonfile.toml** (manual but usually quick)
2. **Build locally** to create template: `cannon build` (save the IPFS hash)
3. **For each network**, import existing deployments:
   ```bash
   # Set the package URL to local template
   cannon alter my-package --chain-id 1 set-url <ipfs-hash>

   # Import each deployed contract/transaction
   cannon alter my-package --chain-id 1 import deploy MyContract 0x...txhash
   ```
4. **Verify** by running build (no steps should execute): `cannon build --chain-id 1`

## Advanced Topics

For detailed information on:
- **CLI reference**: See [references/cli.md](references/cli.md)
- **Cannonfile specification**: See [references/cannonfile.md](references/cannonfile.md)
- **Testing patterns**: See [references/testing.md](references/testing.md)
- **Registry and publishing**: See [references/registry.md](references/registry.md)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "deployment not found" | Package not published for this chain ID. Check `--chain-id` |
| Build fails with "artifact not found" | Run `forge build` first, or check `artifact` path |
| IPFS timeout | Check network connection, may need IPFS gateway |
| Registry publish fails | Verify you have write permissions for the package name |
| **Wrong chain deployed** | Always double-check `--chain-id` — deployments cannot be undone |
| **Published incorrect package** | Registry publishes are permanent — verify version and artifacts first |

## Development Workflow

1. **Develop contracts** with Foundry
2. **Write cannonfile.toml** to define deployment
3. **Build locally** with `cannon build` (chain 13370)
4. **Test** with `cannon test`
5. **Simulate** with `--dry-run` for target chain ⚠️ ALWAYS DO THIS FIRST
6. **Deploy** with `cannon build --chain-id <id>` ⚠️ IRREVERSIBLE on non-local networks (safe on chain 13370)
7. **Verify** contracts on Etherscan with `cannon verify`
8. **Publish** with `cannon publish` ⚠️ PERMANENT ON-CHAIN

## Key Files

| File | Purpose |
|------|---------|
| `cannonfile.toml` | Package definition |
| `cannonfile.lock` | Locked dependencies |
| `.cannon/` | Build cache (gitignored) |
| `deployments/` | Deployment artifacts |
