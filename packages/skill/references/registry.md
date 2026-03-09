# Registry and Publishing

## Overview

Cannon packages are stored on:
1. **On-chain registry** — Ethereum Mainnet, Optimism, Sepolia (stores IPFS URLs)
2. **IPFS** — Stores actual package artifacts (contracts, ABIs, deployment data)
3. **Local cache** — ~/.local/share/cannon/ (for offline access)

## Package Naming

Packages are identified by:
- **Name**: lowercase, alphanumeric, hyphens allowed
- **Version**: semver (e.g., `1.0.0`, `2.1.4`)
- **Preset**: deployment variant (e.g., `main`, `mainnet`, `testnet`)

Full reference: `name:version@preset`
- `synthetix-omnibus:3.1.4@main`
- `usdc:1.0.0@mainnet`

## Publishing Workflow

### 1. Build Locally
```bash
cannon build --chain-id 1 --rpc-url $RPC_URL --private-key $KEY
```

### 2. Verify Build
```bash
cannon inspect my-package:1.0.0@main --chain-id 1
```

### 3. Publish
```bash
cannon publish --chain-id 1 --rpc-url $RPC_URL --private-key $KEY
```

### 4. Verify Publication
```bash
cannon inspect my-package:1.0.0@main --chain-id 1
```

## Registry Contracts

### Mainnet
- Registry: `0x8E2c2E6A0c57dD0f58acE0ba4EBdD7807e0F8708`
- Chain ID: 1

### Optimism
- Registry: `0x8E2c2E6A0c57dD0f58acE0ba4EBdD7807e0F8708`
- Chain ID: 10

### Sepolia
- Registry: `0x8E2c2E6A0c57dD0f58acE0ba4EBdD7807e0F8708`
- Chain ID: 11155111

## Package Mutability

### Version Tags (Immutable)
- `package:1.0.0` — Cannot be changed after publish
- Use for production releases

### Named Tags (Mutable)
- `package:latest` — Can be updated
- Use for development/preview

## Package Contents

When you publish, Cannon uploads to IPFS:
1. **Package code** — Compiled contracts, ABIs
2. **Deployment data** — Addresses, transaction hashes
3. **Metadata** — Settings, topology, dependencies

## Accessing Packages

### From Registry (Default)
```bash
cannon run synthetix-omnibus:3.1.4@main --chain-id 1
```

### Offline Mode
```bash
cannon run synthetix-omnibus:3.1.4@main --registry-priority offline
```

### Local Priority
```bash
cannon run my-package:1.0.0 --registry-priority local
```

## Package Caching

Packages are cached locally for faster access and offline use.

### Cache Locations
```
~/.local/share/cannon/
├── tags/           # Package references (IPFS URLs)
├── ipfs_cache/     # IPFS artifacts
├── build_results/  # Build outputs
└── blobs/          # Large binaries
```

### Cache Management
```bash
# View cache size
du -sh ~/.local/share/cannon/

# Clean all cache
cannon clean --no-confirm

# Clean only unreferenced IPFS packages
cannon clean --ipfs-superfluous --no-confirm
```

## Permission Model

### Publishing
- First publisher of a package name becomes the owner
- Only owner can publish new versions
- Ownership is transferable via registry contract

### Namespace Protection
- Package names are unique per registry
- Claim names early to prevent squatting
- Consider using org prefixes: `org-package`

## Troubleshooting

### "Package not found on registry"
- Package not published for this chain ID
- Check spelling and version number
- Try different preset

### "IPFS timeout"
- Network connectivity issues
- Try again or use IPFS gateway
- Check if package exists in local cache

### "Not authorized to publish"
- You don't own this package name
- Check registry ownership on Etherscan
- Contact package owner

### "Package already exists"
- Immutable version already published
- Bump version number
- Use mutable tag if appropriate
