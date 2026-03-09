# CLI Reference

## Build Command

```bash
cannon build [options]
```

Options:
- `--chain-id <id>` — Target chain ID (default: 13370)
- `--rpc-url <url>` — RPC endpoint URL
- `--private-key <key>` — Private key for deployment
- `--dry-run` — Simulate without sending transactions
- `--impersonate-all` — Use impersonation for all calls (dry-run only)
- `--write-deployments <dir>` — Output directory for deployment files
- `--prefix <prefix>` — Prefix for saved artifacts
- `--preset <name>` — Deployment preset (default: main)
- `--upgrade-from <ref>` — Upgrade from existing package
- `--registry-priority <mode>` — Registry mode: onchain, offline, local

## Run Command

```bash
cannon run <package-reference> [options]
```

Options:
- `--chain-id <id>` — Target chain ID
- `--rpc-url <url>` — RPC endpoint URL
- `--private-key <key>` — Private key for transactions
- `--preset <name>` — Deployment preset
- `--logs` — Show deployment logs
- `--port <port>` — Port for local anvil (default: auto)

## Test Command

```bash
cannon test [options]
```

Options:
- `--match-path <pattern>` — Match specific test files
- `--match-contract <pattern>` — Match specific contract tests
- `--chain-id <id>` — Chain ID for test context
- `--rpc-url <url>` — RPC endpoint for tests
- `--verbose` — Show detailed test output

## Inspect Command

```bash
cannon inspect <package-reference> [options]
```

Options:
- `--chain-id <id>` — Chain ID
- `--preset <name>` — Deployment preset
- `--json` — Output as JSON
- `--topology` — Show action topology/DAG

## Publish Command

```bash
cannon publish [options]
```

Options:
- `--chain-id <id>` — Target chain ID
- `--rpc-url <url>` — RPC endpoint
- `--private-key <key>` — Private key with publish permissions
- `--preset <name>` — Deployment preset
- `--registry-address <addr>` — Override registry address
- `--skip-verify` — Skip IPFS verification

## Clean Command

```bash
cannon clean [options]
```

Options:
- `--no-confirm` — Skip confirmation prompt
- `--ipfs-superfluous` — Delete only unreferenced IPFS packages

## Verify Command

```bash
cannon verify [options]
```

Options:
- `--chain-id <id>` — Target chain ID
- `--rpc-url <url>` — RPC endpoint
- `--etherscan-api-key <key>` — Etherscan API key
- `--preset <name>` — Deployment preset

## Fetch Command

```bash
cannon fetch <package-reference> [options]
```

Options:
- `--chain-id <id>` — Target chain ID
- `--preset <name>` — Deployment preset
- `--output-dir <dir>` — Output directory

## Interact Command

```bash
cannon interact <package-reference> [options]
```

Options:
- `--chain-id <id>` — Target chain ID
- `--rpc-url <url>` — RPC endpoint
- `--preset <name>` — Deployment preset
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
cannon decode <calldata> [options]
```

Options:
- `--chain-id <id>` — Target chain ID
- `--abi <path>` — Custom ABI file
