---
# Cross-Chain Build Concept

> **Status:** Draft RFC
> **Author:** Daniel Beal
> **Created:** 2026-03-18

## Summary
This document proposes a cross-chain build capability for Cannon 3.0, enabling a single cannonfile to define and deploy across multiple chains in a single build process
This addresses the long-standing pain points:
around multi-chain deployments and bridge orchestestration, and having to manually manage multiple chains separately, leading to deployment fragmentation and inconsistent state

## Goals
1. **Single cannonfile, multi-chain support** - Allow declaring which chain IDs the cannonfile supports at the top
2. **Chain-scoped artifacts** - Store deployment outputs organized by chain ID
3. **Cross-chain state access** - Enable referencing state from other chains (e.g., `chains.1.contracts.proxy.address`)

4. **Unified workflow** - Run actions across all chains in a single `cannon build` command

## Proposed Changes

### 1. Cannonfile Schema
Add `chains` array at top-level field:
```toml
name = "my-package"
version = "1.0.0"
# NEW: Declare supported chain IDs
chains = [1, 42161, 10, 8453, 137]

[preset.main]

[vars.proxy]
source = "0x1234567890abcdef01234567890"

# Chain-specific contract addresses
chains.1.contracts.proxy = "0x..."  # mainnet proxy
chains.42161.contracts.proxy = "0x..."  # arbitrum
chains.10.contracts.proxy = "0x..."  # optimism
```

### 2. Artifact Storage Structure
Current:
```
artifacts/
├── contracts/
│   ├── Proxy.json
├── txns/
```

Proposed:
```
artifacts/
├── 1/
│   ├── contracts/
│   │   ├── Proxy.json
│   ├── txns/
│   └── ...
├── 42161/
│   ├── contracts/
│   │   ├── Proxy.json
│   ├── txns/
│   └── ...
├── 10/
│   ├── contracts/
│   │   ├── Proxy.json
│   ├── txns/
│   └── ...
```

### 3. State Access Syntax
Access cross-chain state using `chains.<chainId>` prefix:

Examples:
```toml
# Get proxy address from mainnet (chain ID 1)
proxy_addr = "<%= chains.1.contracts.proxy.address %>"

# Get proxy address from arbitrum (chain ID 42161)
arb_proxy = "<%= chains.42161.contracts.proxy.address %>"

# Get all deployed contracts across chains
all_contracts = "<%= chains %>"  # returns a map of chainId -> contracts
```

### 4. Filter by Chains (Existing Feature)
Actions can already be filtered using the `chains` property
```toml
[deploy.Main]
chains = [1, 42161]  # mainnet and arbitrum only

[deploy.ArbitrumProxy]
artifact = "ArbitrumProxy.sol:Proxy.sol"
```

### 5. Cross-Chain Dependencies
Actions can depend on outputs from other chains using `chains.<chainId>` syntax

```toml
[deploy.OwnedProxy]
artifact = "OwnedProxy.sol"
# This depends on Proxy deployed on chain 1 (mainnet)
depends = ["deploy.Proxy"]

[deploy.OptimismOwned]
artifact = "OptimismOwned.sol"
# This depends on Proxy (mainnet) AND OwnedProxy (arbitrum)
depends = ["deploy.Proxy", "deploy.OwnedProxy"]
```

## Benefits
1. **Unified Deployment** - Deploy same contracts across multiple chains in one command
2. **State Sharing** - Use outputs from one chain as inputs to another
3. **Simplified Management** - Single source of truth for all chain states
4. **Multi-chain Packages** - Deploy the same package to all supported chains
5. **Bridge Agnostic** - No bridge-specific logic required (can use encodeFunctionCall)
6. **Breaking Change** - Artifact storage structure changes (Cannon 3.00)

## Implementation Notes
- Requires updates to `cannon inspect` output to display chain-aware results
- Requires updates to builder to handle multi-chain state
- Consider adding `--chain-id` flag in CLI for selective building
- May need new `--chains` validation in cannonfile
