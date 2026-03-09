# Registry and Publishing

## What is the Cannon Registry?

The Cannon registry is an on-chain smart contract that stores package metadata and deployment data. It enables:
- Version management for packages
- Package discovery and sharing
- Integration with other projects
- **On-chain verification** of deployed packages (anyone can verify what was deployed)

Registry address: `0x8E2c2E6A0c57dD0f58acE0ba4EBdD7807e0F8708`

## Browsing Packages

Deployed registry packages are visible on the Cannon website at:
```
https://usecannon.com/packages/<package-name>/<version>/<chainId>-<preset>
```

Example: https://usecannon.com/packages/safe/1.4.1/13370-main

**Recommended:** Share this URL with users after successfully publishing a package!

## Registry Networks

### Mainnet (Chain ID: 1)
- Primary registry for package ownership
- Package names are registered here first

### Optimism (Chain ID: 10) - Recommended
- **Recommended for publishing** (lower gas costs)
- Synced with mainnet registry via cross-chain bridge

**Important:** Mainnet and Optimism registries are synced together through a cross-chain bridge. Package ownership is synchronized automatically within a couple of minutes. You can only register a new package name on mainnet.

## Publishing

Publishing makes your package available on the on-chain registry and IPFS.

### Publishing Fee

There is a fee each time a package is published: **0.0025 ETH**

This fee covers:
- On-chain registry storage
- IPFS pinning service (Cannon provides IPFS hosting)

### Publish Command

```bash
cannon publish --chain-id 10 --rpc-url $RPC_URL
```

If `--private-key` is not specified, it will be requested via stdin.

**Note:** You may want to use `--exclude-cloned` to prevent publishing subpackages if your setup clones other packages that should remain separate.

### Package Ownership

- First publisher of a package name becomes the owner
- Only the owner can publish new versions
- Ownership is transferable via registry contract

### Additional Publishers

Owners can authorize additional addresses to publish on their behalf:

```bash
# On mainnet (required for Optimism publishing)
cannon publishers my-package --chain-id 1 --rpc-url $RPC_URL
```

Or call `setAdditionalPublishers` directly on the mainnet registry contract.

**Note:** When publishing on Optimism, additional publishers must be set on mainnet first, as this is not done automatically.

## Package Contents

When you publish, Cannon uploads to IPFS:
- Package definition (cannonfile)
- Contract ABIs
- Deployed addresses
- Transaction data

Cannon provides an IPFS service alongside package publishes (included in the publishing fee) which is used by default.

**On-chain Verification:** The registry stores package metadata on-chain, allowing anyone to cryptographically verify what was deployed. This enables trustless verification of deployment integrity.

## Cache Locations

Default: `~/.local/share/cannon/`

Override with `CANNON_DIRECTORY` environment variable.

Directory structure:
```
~/.local/share/cannon/
├── tags/        # Package references (IPFS URLs)
└── ipfs_cache/  # Cached IPFS artifacts
```

## Clean Command

```bash
# Delete all cache
cannon clean

# Delete only unreferenced IPFS packages
cannon clean --ipfs
```

## Private Source Code

By default, Cannon includes your project's source code in published packages.

To prevent this, add to your `cannonfile.toml`:
```toml
privateSourceCode = true
```

## Troubleshooting

### "deployment not found"
- Package not published for this chain ID
- Check `--chain-id` matches the deployment network

### "Not authorized to publish"
- You don't own this package name
- Check if you're the owner or an additional publisher
- May need to set additional publishers on mainnet (especially for Optimism)

### IPFS timeout
- Check network connection
- May need to configure a custom IPFS gateway

### Registry publish fails
- Verify you have write permissions for the package name
- Ensure you have enough ETH for the publishing fee (0.0025 ETH)
- For Optimism, ensure additional publishers are set on mainnet

## Best Practices

1. **Publish on Optimism** - Lower gas costs
2. **Set additional publishers** - On mainnet before publishing to Optimism
3. **Use semantic versioning** - Clear version history
4. **Test before publishing** - Registry publishes are permanent
5. **Consider privateSourceCode** - If source should remain private
