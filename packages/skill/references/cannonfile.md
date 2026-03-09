# Cannonfile Specification

## Structure

A cannonfile.toml defines a Cannon package with metadata, variables, and actions.

```toml
#:schema https://raw.githubusercontent.com/usecannon/cannon/refs/heads/dev/packages/lsp/src/schema.json

name = "my-package"
version = "1.0.0"
description = "My package description"
tags = ["defi", "token"]
preset = "main"

# Variables
[var.settings]
owner = "0x0000000000000000000000000000000000000000"
initialSupply = "1000000000000000000000000"

# Actions execute in order based on dependencies
[deploy.MyContract]
artifact = "MyContract"
args = ["<%= settings.owner %>"]
```

## Variables (`var`)

Define configurable settings. Cannon automatically provides `chainId` as a built-in variable.

```toml
[var.settings]
# The label "settings" is just for organization - you can use any label
owner = "0x0000000000000000000000000000000000000000"
initialSupply = "1000000000000000000000000"
salt = "my-package"
```

Access with: `<%= settings.owner %>` or `<%= settings.initialSupply %>`

Override at build time:
```bash
cannon build cannonfile.toml owner=0x1234... salt=custom-salt
```

## Deploy Action

Deploy a contract from compiled artifacts.

```toml
[deploy.Token]
artifact = "Token"
args = ["My Token", "TKN", "<%= settings.initialSupply %>", "<%= settings.owner %>"]
create2 = true
salt = "<%= settings.salt %>"
libraries = { Utils = "<%= contracts.Utils.address %>" }
from = "<%= settings.deployer %>"
value = "<%= parseEther('1.0') %>"
```

## Invoke Action

Call a function on a deployed contract.

```toml
[invoke.initialize]
target = ["Token"]
func = "initialize"
args = ["<%= settings.owner %>"]
from = "<%= settings.owner %>"
```

Note: `target` uses the contract label directly (e.g., `["Token"]`), not the full address path.

## Clone Action

Deploy another Cannon package as a "blueprint". Use when you want to deploy a fresh instance of an existing package.

**Important:** Always set `target` appropriately:
- Same as `source` if you own the package
- New name if you don't own it

```toml
[clone.safe]
source = "mycompany-safe:1.4.1@team"
target = "safe"
```

Access: `<%= safe.Safe.address %>` (shorthand) or `<%= imports.safe.contracts.Safe.address %>` (full)

## Import Action

Pull data from an already-deployed package without re-deploying. Use when you need to reference existing deployments.

```toml
[import.usdc]
source = "usdc:1.0.0@main"
```

Access: `<%= usdc.USDC.address %>` (shorthand) or `<%= imports.usdc.contracts.USDC.address %>` (full)

## Router Action

Create a router contract that efficiently passes calls to downstream contracts. Powerful when combined with a UUPS proxy for upgradable contracts that exceed the contract size limit.

```toml
[deploy.CoreImplementation]
artifact = "Core"

[deploy.AnotherImplementation]
artifact = "Another"

[router.CoreRouter]
dependencies = ["CoreImplementation", "AnotherImplementation"]
```

## Diamond Action (EIP-2535)

Create a Diamond proxy with multiple facets.

```toml
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

Templates can be used anywhere a string is defined. They're JavaScript expressions.

Cannon automatically topologically orders deployment steps based on dependencies in template syntax, so `depends =` is rarely needed.

### Accessing Settings
```toml
<%= settings.varName %>
```

### Accessing Chain ID (Built-in)
```toml
<%= chainId %>  # Cannon provides this automatically
```

### Accessing Contract Data
```toml
<%= contracts.ContractName.address %>
<%= contracts.ContractName.abi %>
```

### Accessing Imports (Shorthand)
```toml
<%= pkgName.ContractName.address %>  # Preferred shorthand
<%= imports.pkgName.contracts.Contract.address %>  # Full syntax
```

### Helpers
Available helpers include all functions from `ethers.utils` (ethers v5), plus:
- `encodeFunctionData` from viem
- Constants like `AddressZero` from `ethers.constants`

```toml
<%= parseEther("1.0") %>           # Convert to wei
<%= formatBytes32String("hello") %> # Convert to bytes32
<%= AddressZero %>                  # 0x000...000
<%= encodeFunctionData(abi, fn, args) %>
```

## Conditional Actions

Use `only` to conditionally execute actions.

```toml
[deploy.OnlyOnMainnet]
artifact = "MainnetOnly"
only = "<%= chainId == 1 %>"

[deploy.OnlyOnL2]
artifact = "L2Only"
only = "<%= chainId != 1 %>"
```

## Action Dependencies

Actions execute based on dependency order (resolved from template syntax), not file order.

```toml
# These can be in any order - Cannon resolves dependencies from templates
[invoke.init]
target = ["<%= contracts.Token.address %>"]  # Depends on deploy.Token

[deploy.Token]
artifact = "Token"
```

## Overriding Settings at Build Time

Pass settings directly to the build command:

```bash
cannon build cannonfile.toml owner=0x1234123412341234123412341234123412341234 salt=foobar
```

Any `var` with matching keys will be overridden.

## Best Practices

1. **Use semantic versioning** for package versions
2. **Test locally** (chain 13370) before mainnet
3. **Use clone** to deploy fresh instances of existing packages
4. **Use import** to reference already-deployed packages
5. **Set target** appropriately when cloning (same as source if you own it)
