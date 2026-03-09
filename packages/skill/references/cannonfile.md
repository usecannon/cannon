# Cannonfile Specification

## Structure

A cannonfile.toml defines a Cannon package with settings, imports, and actions.

```toml
# Package metadata (optional but recommended)
name = "my-package"
version = "1.0.0"
description = "My package description"
tags = ["defi", "token"]

# Settings (modern syntax - use [var.*])
[var.chainId]
defaultValue = 1

[var.owner]
defaultValue = "0x..."

# Actions execute in order based on dependencies
[deploy.MyContract]
artifact = "MyContract"
```

## Variables (`var`)

Define configurable settings with defaults and validation.

```toml
[var.chainId]
defaultValue = 1
description = "Target chain ID"

[var.owner]
defaultValue = "0x0000000000000000000000000000000000000000"
description = "Contract owner address"

[var.initialSupply]
defaultValue = "1000000000000000000000000"
description = "Initial token supply"
```

Access with: `<%= settings.varName %>`

## Deploy Action

Deploy a contract from compiled artifacts.

```toml
[deploy.Token]
artifact = "Token"
args = [
    "<%= settings.name %>",
    "<%= settings.symbol %>",
    "<%= settings.initialSupply %>",
    "<%= settings.owner %>"
]
create2 = true                          # Use CREATE2 for deterministic address
salt = "<%= settings.chainId %>"        # CREATE2 salt
libraries = { Library = "<%= contracts.Library.address %>" }
from = "<%= settings.deployer %>"       # Override sender
value = "1000000000000000000"           # Send ETH with deployment
```

## Invoke Action

Call a function on a deployed contract.

```toml
[invoke.setOwner]
target = ["<%= contracts.Token.address %>"]
func = "transferOwnership"
args = ["<%= settings.newOwner %>"]
from = "<%= settings.owner %>"

[invoke.mint]
target = ["<%= contracts.Token.address %>"]
func = "mint"
args = [
    "<%= settings.recipient %>",
    "<%= settings.amount %>"
]
value = "0"                             # Send ETH
```

## Clone Action

Import another Cannon package as a dependency.

```toml
[clone.synthetix]
source = "synthetix-omnibus:3.1.4@main"
target = "synthetix"
chainId = "<%= settings.chainId %>"     # Override chain ID
preset = "main"                         # Override preset
```

Access cloned contracts: `<%= imports.synthetix.contracts.CoreProxy.address %>`

## Pull Action

Import data/artifacts from another package.

```toml
[pull.usdc]
source = "usdc:1.0.0@main"
alias = "usdc"
```

Access: `<%= imports.usdc.contracts.USDC.address %>`

## Router Action

Create a Synthetix Router to bypass contract size limits.

```toml
[deploy.Router]
artifact = "Router"
args = ["<%= settings.owner %>"]

[deploy.CoreImplementation]
artifact = "Core"
libraries = { Utils = "<%= contracts.Utils.address %>" }

[router.CoreRouter]
dependencies = ["CoreImplementation"]
```

## Diamond Action

Create an EIP-2535 Diamond with multiple facets.

```toml
[deploy.Diamond]
artifact = "Diamond"
args = ["<%= settings.owner %>"]

[deploy.FacetA]
artifact = "FacetA"

[deploy.FacetB]
artifact = "FacetB"

[diamond.MainDiamond]
facets = ["FacetA", "FacetB"]
init = "DiamondInit"
initArgs = ["<%= settings.owner %>"]
```

## Template Syntax

### Accessing Settings
```toml
<%= settings.varName %>
```

### Accessing Contract Data
```toml
<%= contracts.ContractName.address %>
<%= contracts.ContractName.abi %>
<%= contracts.ContractName.deployTx %>
```

### Accessing Imports
```toml
<%= imports.pkgName.contracts.Contract.address %>
<%= imports.pkgName.txns.txName.hash %>
```

### Accessing Transactions
```toml
<%= txns.txName.hash %>
<%= txns.txName.address %>  # If transaction created a contract
```

### Helpers
```toml
<%= parseEther("1.0") %>           # Convert to wei
<%= formatBytes32String("hello") %> # Convert to bytes32
<%= zeroAddress %>                  # 0x000...000
```

## Conditional Actions

Use `only` to conditionally execute actions.

```toml
[deploy.OnlyOnMainnet]
artifact = "MainnetOnly"
only = "<%= settings.chainId == 1 %>"

[deploy.OnlyOnL2]
artifact = "L2Only"
only = "<%= settings.chainId != 1 %>"
```

## Multiple Actions of Same Type

Suffix with `.` to create multiple actions.

```toml
[deploy.TokenA]
artifact = "Token"
args = ["Token A", "TKA"]

[deploy.TokenB]
artifact = "Token"
args = ["Token B", "TKB"]
```

## Action Dependencies

Actions execute based on dependency order, not file order.

```toml
# These can be in any order - Cannon resolves dependencies
[invoke.init]
target = ["<%= contracts.Token.address %>"]  # Depends on deploy.Token

[deploy.Token]  # Will execute first
artifact = "Token"
```

## Presets

Define multiple deployment presets.

```toml
# Default preset (main)
[var.chainId]
defaultValue = 1

# Custom preset
[preset.mainnet]
var.chainId.defaultValue = 1
var.owner.defaultValue = "0x..."

[preset.testnet]
var.chainId.defaultValue = 11155111
var.owner.defaultValue = "0x..."
```

Build with preset:
```bash
cannon build --preset mainnet
```

## Best Practices

1. **Use semantic versioning** for package versions
2. **Document settings** with descriptions
3. **Use create2** for deterministic addresses when needed
4. **Import packages** instead of duplicating deployments
5. **Test locally** (chain 13370) before mainnet
6. **Use presets** for different network configurations
