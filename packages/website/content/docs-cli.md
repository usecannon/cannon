## Commands

Run the commands below with `npx @usecannon/cli <command>` (or `cannon <command>` if you’ve installed it with `npm -g i @usecannon/cli`). If no command is specified, the CLI will execute the "run" command.

If you’re using the Hardhat plug-in, you can access some commands as tasks. For example, the build command could be executed with `npx hardhat cannon:build`.

### run

The `run` command starts a local node with the specified package. It opens an interactive CLI where you can access logs and interact with the deployed contracts.

**Arguments**

- `<packageNames>` - Name and version of the package to run. Assumes `latest` if no version if specified. Settings for the package can be specified following the package name. For example, `npx @usecannon/cli synthetix` and `npx @usecannon/cli synthetix:2.75 owner=0x0000 erc20 symbol=TKN` is a valid command.

**Options**

- `--port` - Port which the JSON-RPC server will be exposed. (_Default: "8545"_)
- `--chain-id` - Fork the network with the given chain id. (For the Hardhat plug-in, use `--network` to reference a network in your Hardhat configuration instead.)
- `--provider-url` - Fork the network at the specified RPC url. If specified, `--chain-id` is ignored.
- `--preset` - Load an alternative preset. (_Default: "main"_)
- `--logs` - Show RPC logs instead of an interactive prompt.
- `--impersonate` - Create impersonated signers instead of using real wallets. (_Default: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"_)
- `--fund-addresses` - Pass a list of addresses to receive a balance of 10,000 ETH.
- `--private-key` - Use the specified private key hex to interact with the contracts.

### build

The `build` command will attempt to build a specified blockchain into the state defined by a Cannonfile.

**Arguments**

- `<cannonfile>` - Path to a cannonfile (_Default: "cannonfile.toml"_)
- `<settings...>` - Custom settings for building the cannonfile

**Options**

- `--chain-id` - Build a cannon package for the given chain id. Will connect to a local RPC provider (such as Frame).
- `--provider-url` - RPC endpoint to execute the deployment on. (For the Hardhat plug-in, reference a network in your Hardhat configuration instead.)
- `--preset` - The preset label for storing the build with the given settings (_Default: "main"_)
- `--dry-run` - Simulate building on a local fork rather than deploying on the real network.
- `--private-key` - Specify a private key which may be needed to sign a transaction.
- `--wipe` - Clear the existing deployment state and start this deploy from scratch.
- `--upgrade-from` - Specify a package to use as a new base for the deployment.

### alter

The `alter` command can be used to alter the state of an existing cannon package.

**Arguments**

- `<packageName:packageVersion>` - Name and version of the package to alter
- `<command>` - Alteration command to execute.

Current `command` Options:

- `set-url <newIpfsUrl>` - Replace the IPFS url where the package is pinned
- `set-contract-address <contractName> <contractAddress>` - Replace the contract address for a specified contract
- `mark-complete` - Sets the new state hash for the package
- `mark-incomplete` - Removes the state hash for the package and marks it as incomplete

**Options**

- `--chain-id` - Alter a cannon package for the given chain id.
- `--preset` - The preset label to alter the state for (_Default: "main"_)

The `alter` command can also be used to "import" deployed contracts at specified addresses and publish them to the registry for use inside of Cannon's context.
This means that you can essentially 'fake' a deployment and utilize functionality from any contracts that have been deployed on any EVM chain from the context of your build configuration.

**Note**: An instance of the contract must be built and deployed as a package on the registry before being able to alter it.

For example, if you want to use Chainlink's Link Token contract on Ethereum in your Cannon build context:

Cannonfile.toml:

```toml
name = "chainlink-token"
version = "1.0.0"

[setting.recipient]
defaultValue = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

[contract.Token]
artifact = "LinkToken"
from = "<%= settings.recipient %>"
```

After building and publishing:

```bash
cannon alter token:1.0.0 --chain-id 1 set-contract-address Token '0x514910771AF9Ca656af840dff83E8264EcF986CA'
```

This will set the address of the token contract to the LINK token contract on ETH.

### decode

Decode a transaction hash and display trace data for the error.

**Arguments**

- `<packageName>` - Name and version of the package to alter
- `<txHash>` - Failed Transaction hash signature

**Options**

- `--chain-id` - Build a cannon package for the given chain id. Will connect to a local RPC provider (such as Frame).
- `--preset` - The preset label for storing the build with the given settings (_Default: "main"_)
- `--json` - display the trace data in JSON format.

### clean

The `clean` command will attempt to delete any local tags and cached metadata files.

**Example**

```bash
cannon clean
```


### verify

Verify a package on Etherscan.

**Arguments**

- `<packageName:packageVersion>` - Name and version of the package to verify

**Options**

- `--api-key` - Etherscan API key
- `--chain-id` - Chain ID of deployment to verify (_Default: "1"_)

### publish

Publish a Cannon package to the registry for all networks where this package has been deployed.

**Arguments**

- `<packageName:packageVersion>` - Name and version of the package to publish

**Options**

- `--registry-provider-url` RPC endpoint to use when publishing.
- `--chain-id` - The network which the registry to deploy to is on. Default: 1 (mainnet)
- `--private-key` - Private key of the wallet to use when publishing. If not specified, uses a local wallet provider (such as Frame)
- `--preset` - Preset name to use (_Default: "main"_)
- `--tags` - Comma separated list of labels (_Default: "latest"_)
- `--gas-limit` - The maximum units of gas spent for the registration transaction')
- `--max-fee-per-gas` - `The maximum value (in gwei) for the base fee when submitting the registry transaction.
- `--max-priority-fee-per-gas` - The maximum value (in gwei) for the miner tip when submitting the registry transaction.
- `--quiet` - Only output final JSON object at the end, no human readable output.

### inspect

Inspect the details of a Cannon package.

**Arguments**

- `packageName:packageVersion` - The name and version of a package. Version defaults to `latest` if not specified. (_Example: synthetix:latest_)

**Options**

- `--chain-id` - Chain ID of the variant to inspect
- `--preset` - Preset of the variant to inspect
- `--json` - Output full details as JSON (_Default: false_)
- `--write-deployments` - Path to write the deployments data (address and ABIs), like "./deployments"

### interact

Start an interactive terminal to use with a Cannon package's deployment on a live network. (This is an alternative to interacting with a local fork using the run command.) This command is not available in the Hardhat plug-in.

**Arguments**

- `packageName:packageVersion` - The name and version of a package. Version defaults to `latest` if not specified. (_Example: synthetix:latest_)

**Options**

- `--chain-id` - The Chain ID of the package to interact with. Default: 1 (mainnet)
- `--provider-url` - RPC endpoint to execute interactions on. The chain ID for the deployment used from the package is determined by the RPC endpoint. Ignores `--chain-id` if specified
- `--preset` - The preset to load. (_Default: "main"_)
- `--mnemonic` - Use the specified mnemonic to initialize a chain of signers while running.
- `--private-key` - Use the specified private key hex to interact with the contracts. Uses the local wallet provider's signer if unspecified.

### plugin add

Specify a package to install via NPM and register as a Cannon plug-in.

**Arguments**

- `name` - The name of the NPM package.

### plugin remove

Specify a package that was added as a Cannon plug-in and remove it.

**Arguments**

- `name` - The name of the NPM package.

### setup

Start the wizard to create or update a `settings.json` file for Cannon that specifies IPFS and Ethereum RPC configuration.
