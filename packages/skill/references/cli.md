# CLI Reference

## Debugging

If something is misbehaving, increase debugging verbosity:

```bash
# Using DEBUG environment variable (NodeJS debug module)
DEBUG=cannon:* cannon build

# Or using verbose flags (increasing verbosity)
cannon build -v    # basic verbosity
cannon build -vv   # more verbose
cannon build -vvv  # most verbose
```

## Build Command

```bash
cannon build [options]
```

Options:
- `--chain-id <id>` — Target chain ID (default: 13370, derived from `--rpc-url` if not specified)
- `--rpc-url <url>` — RPC endpoint URL
- `--private-key <key>` — Private key for deployment (or set `CANNON_PRIVATE_KEY` env var)
- `--impersonate <addresses>` — Impersonate specific addresses (comma-separated, recommended for dry-run)
- `--impersonate-all` — Impersonate all addresses (dry-run only)
- `--dry-run` — Simulate without sending transactions (always use before real deployments!)
- `--keep-alive` — Keep anvil running after build (useful with dry-run)
- `--port <port>` — Port for local anvil
- `--write-deployments <dir>` — Output directory for deployment files
- `--upgrade-from <ref>` — Upgrade from existing package (only if auto-detected package is wrong)

Note: If `cannon <package>` is run and the command isn't recognized, Cannon automatically executes `cannon run <package>`.

## Run Command

```bash
cannon run <package-reference> [options]
# Or simply:
cannon <package-reference>
```

Options:
- `--chain-id <id>` — Target chain ID (derived from `--rpc-url` if not specified)
- `--rpc-url <url>` — RPC endpoint URL
- `--private-key <key>` — Private key for transactions (or set `CANNON_PRIVATE_KEY` env var)
- `--impersonate <addresses>` — Impersonate specific addresses

Package reference: `<name>:<version>@<preset>` (preset is optional)

## Test Command

```bash
cannon test [options]
```

Designed to work with Foundry projects. Runs forge tests with Cannon deployment context.

Options:
- `--match-path <pattern>` — Match specific test files
- `--match-contract <pattern>` — Match specific contract tests
- `--chain-id <id>` — Chain ID for test context
- `--rpc-url <url>` — RPC endpoint for tests
- `--verbose` — Show detailed test output

See cannon-std documentation for testing patterns.

## Inspect Command

```bash
cannon inspect <package-reference> [options]
```

Options:
- `--chain-id <id>` — Chain ID
- `--out <format>` — Output format (json, yaml, toml, etc.)
- `--write-deployments <dir>` — Output directory for deployment files

Package reference: `<name>:<version>@<preset>`

## Publish Command

```bash
cannon publish [options]
```

Options:
- `--chain-id <id>` — Target chain ID (default: mainnet or optimism)
- `--rpc-url <url>` — RPC endpoint (if not specified, will be requested via stdin)
- `--private-key <key>` — Private key with publish permissions (or set `CANNON_PRIVATE_KEY` env var)

Note: There is a fee each time a package is published (currently 0.0025 ETH). Cannon provides an IPFS service included in the publishing fee.

## Clean Command

```bash
cannon clean [options]
```

Options:
- `--no-confirm` — Skip confirmation prompt
- `--ipfs` — Delete only unreferenced IPFS packages

## Verify Command

```bash
cannon verify [options]
```

Options:
- `--chain-id <id>` — Target chain ID
- `--rpc-url <url>` — RPC endpoint
- `--etherscan-api-key <key>` — Etherscan API key
- `--service <name>` — Verification service: `etherscan`, `sourcify`, or `all` (verifies to both)

## Fetch Command

```bash
cannon fetch <package-reference> [options]
```

Options:
- `--chain-id <id>` — Target chain ID
- `--output-dir <dir>` — Output directory

## Interact Command

```bash
cannon interact <package-reference> [options]
```

Options:
- `--chain-id <id>` — Target chain ID
- `--rpc-url <url>` — RPC endpoint
- `--contract <name>` — Target contract name

## Trace Command

```bash
cannon trace <tx-hash> [options]
```

Options:
- `--chain-id <id>` — Target chain ID
- `--rpc-url <url>` — RPC endpoint
- `--verbose` — Show detailed trace

## Decode Command

```bash
cannon decode <package-reference> <hex-data> [options]
```

Options:
- `--chain-id <id>` — Target chain ID

Decodes function calls, events, and errors using package ABIs.

## Alter Command

Modify existing Cannon packages outside the regular build process.

```bash
cannon alter <package-reference> <subcommand> [options]
```

Subcommands:
- `import <step-type> <step-name> <tx-hash>` — Import existing deployment/transaction
- `set-contract-address <step-name> <address>` — Update contract address
- `mark-complete <step-name>` — Mark step as complete
- `mark-incomplete <step-name>` — Mark step as incomplete
- `set-url <url>` — Update deployment URL reference
- `set-misc <url>` — Update miscellaneous data URL
- `clean-unused` — Remove unused deployment states

Options:
- `--chain-id <id>` — Target chain ID

## Publishers Command

Manage additional publishers for a package.

```bash
cannon publishers <package-reference> [options]
```

Options:
- `--chain-id <id>` — Target chain ID (must be mainnet)
- `--rpc-url <url>` — RPC endpoint
- `--private-key <key>` — Owner's private key

Note: Additional publishers must be set on mainnet when publishing to Optimism.

## Register Command

Register a new package name on the registry.

```bash
cannon register <package-name> [options]
```

Options:
- `--chain-id <id>` — Target chain ID (mainnet only)
- `--rpc-url <url>` — RPC endpoint
- `--private-key <key>` — Private key

## Environment Variables

- `CANNON_PRIVATE_KEY` — Private key for deployments/publishing
- `CANNON_DIRECTORY` — Override default storage directory (default: `~/.local/share/cannon/`)
