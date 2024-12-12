import { debugVerbosity } from './debug';
import { CommandsConfig } from './types';
import { forgeBuildOptions } from './forge/build';
import { forgeTestOptions } from './forge/test';
import { anvilOptions } from './anvil';

import { ANVIL_FIRST_ADDRESS, ANVIL_PORT_DEFAULT_VALUE } from '../../constants';

export const commandsConfig: CommandsConfig = {
  run: {
    description: 'Run a local Cannon package (Chain ID: 13370) on a local node for development and testing',
    usage: '[global options] ...[<name>[:<semver>] ...[<key>=<value>]]',
    arguments: [
      {
        flags: '<packageRefs...>',
        description: 'List of packages to load, optionally with custom settings for each one',
      },
    ],
    options: [
      {
        flags: '-n --rpc-url [url]',
        description: 'RPC endpoint to fork off of',
      },
      {
        flags: '--provider-url [url]',
        description: '(DEPRECATED) RPC endpoint to fork off of. Use --rpc-url',
      },
      {
        flags: '-c --chain-id <chainId>',
        description: 'Chain Id of the deployment you are running',
      },
      {
        flags: '--port <number>',
        description: 'Port which the JSON-RPC server will be exposed. [default: 0]',
        defaultValue: ANVIL_PORT_DEFAULT_VALUE,
      },
      {
        flags: '--build',
        description: 'Specify to rebuild generated artifacts with latest, even if no changed settings have been defined.',
      },
      {
        flags: '--upgrade-from [cannon-package:0.0.1]',
        description: 'Specify a package to use as a new base for the deployment.',
      },
      {
        flags: '--registry-priority <registry>',
        description: 'Change the default registry to read from first. Default: onchain',
      },
      {
        flags: '--logs',
        description: 'Show RPC logs instead of an interactive prompt',
      },
      {
        flags: '--fund-addresses <fundAddresses...>',
        description: 'Pass a list of addresses to receive a balance of 10,000 ETH',
      },
      {
        flags: '--impersonate <address>',
        description: 'Impersonate all calls from the given signer instead of a real wallet. Only works with --fork',
        defaultValue: ANVIL_FIRST_ADDRESS,
      },
      {
        flags: '--mnemonic <phrase>',
        description: 'Use the specified mnemonic to initialize a chain of signers while running',
      },
      {
        flags: '--private-key [key]',
        description: 'Specify a comma separated list of private keys which may be needed to sign a transaction',
      },
      {
        flags: '--non-interactive',
        description: 'Do not prompt for any user input. Useful for scripts and CI processes.',
      },
      ...debugVerbosity,
    ],
    anvilOptions,
  },
  build: {
    description: 'Build a package from a Cannonfile.',
    arguments: [
      {
        flags: '[cannonfile]',
        description: 'Path to a cannonfile',
        defaultValue: 'cannonfile.toml',
      },
      {
        flags: '[settings...]',
        description: 'Custom settings for building the cannonfile',
      },
    ],
    options: [
      {
        flags: '-n --rpc-url [url]',
        description: 'RPC endpoint to execute the deployment on',
      },
      {
        flags: '--provider-url [url]',
        description: '(DEPRECATED) RPC endpoint to fork off of. Use --rpc-url',
      },
      {
        flags: '-c --chain-id <chainId>',
        description: 'The chain id to run against',
      },
      {
        flags: '--port <number>',
        description: 'Port which the JSON-RPC server will be exposed. [default: 0]',
        defaultValue: ANVIL_PORT_DEFAULT_VALUE,
      },
      {
        flags: '--dry-run',
        description:
          'Simulate building on a local fork rather than deploying on the real network. Impersonates all signers.',
      },
      {
        flags: '--impersonate [addresses]',
        description: 'Specify a comma separated list of signers to impersonate. Only works with --dry-run',
      },
      {
        flags: '--keep-alive',
        description:
          'After completing build, leave RPC open and switch into run mode. Has no effect on live network deployment.',
      },
      {
        flags: '--private-key [key]',
        description: 'Specify a comma separated list of private keys which may be needed to sign a transaction',
      },
      {
        flags: '--wipe',
        description: 'Clear the existing deployment state and start this deploy from scratch.',
      },
      {
        flags: '--upgrade-from [cannon-package:0.0.1]',
        description: 'Specify a package to use as a new base for the deployment',
      },
      {
        flags: '--skip-upgrade-record',
        description:
          'Skip step taken at the end of the build to save the execution record on-chain, which would be used for future reference on upgrades',
      },
      {
        flags: '--registry-priority <registry>',
        description: 'Change the default registry to read from first. Default: onchain',
      },
      {
        flags: '--gas-price <gasPrice>',
        description: 'The gas price used by all transactions processed by this build. Expressed in GWEI.',
      },
      {
        flags: '--max-gas-fee <maxGasFee>',
        description: 'Specify max fee per gas (EIP-1559) for all transactions processed by this build. Expressed in GWEI.',
      },
      {
        flags: '--max-priority-gas-fee <maxpriorityGasFee>',
        description: 'Specify max fee per gas (EIP-1559) for all transactions processed by this build. Expressed in GWEI.',
      },
      {
        flags: '--skip-compile',
        description: 'Skip the compilation step and use the existing artifacts',
      },
      {
        flags: '--write-script <writeScript>',
        description: '(Experimental) Path to write all the actions taken as a script that can be later executed',
      },
      {
        flags: '-w --write-deployments <writeDeployments>',
        description: 'Path to write the deployments data (address and ABIs), like "./deployments"',
      },
      {
        flags: '--write-script-format <writeScriptFormat>',
        description: '(Experimental) Format in which to write the actions script (Options: json, ethers)',
        defaultValue: 'ethers',
      },
      {
        flags: '-q --quiet',
        description: 'Suppress extra logging',
      },
      ...debugVerbosity,
    ],
    anvilOptions: anvilOptions,
    forgeOptions: forgeBuildOptions,
  },
  verify: {
    description: 'Verify a package on Etherscan',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the Cannon package to verify (name:version@preset)',
      },
    ],
    options: [
      {
        flags: '-a --api-key <apiKey>',
        description: 'Etherscan API key',
      },
      {
        flags: '-c --chain-id <chainId>',
        description: 'Chain ID of deployment to verify',
      },
      ...debugVerbosity,
    ],
  },
  diff: {
    description: 'Confirm that the contracts in a package match up with those in a contracts source code directory',
    arguments: [
      {
        flags: '<packageRef>',
        description:
          'Name, version and preset of the Cannon package to match up with a source code directory (name:version@preset)',
      },
      {
        flags: '<projectDirectory>',
        description: 'The directory of the foundry project to be compared against.',
      },
    ],
    options: [
      {
        flags: '-c --chain-id <chainId>',
        description: 'Chain ID of deployment to verify',
      },
      {
        flags: '--match-contract <name>',
        description: 'Regex of contracts to match. Default: compare all contracts',
        defaultValue: '',
      },
      {
        flags: '--match-source <path>',
        description: 'Regex of source code file names to match. Default: compare all source code paths',
        defaultValue: '',
      },
      ...debugVerbosity,
    ],
  },
  alter: {
    description: 'Change a cannon package outside of the regular build process.',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the Cannon package to alter (name:version@preset)',
      },
      {
        flags: '<command>',
        description:
          'Alteration command to execute. Current options: set-url, set-contract-address, mark-complete, mark-incomplete',
      },
      {
        flags: '[options...]',
        description: 'Additional options for your alteration command',
      },
    ],
    options: [
      {
        flags: '-c --chain-id <chainId>',
        description: 'Chain ID of deployment to alter',
      },
      {
        flags: '-s --subpkg <subpackagePath>',
        description:
          'When the change needs to be made in a subpackage, specify the step names leading to the subpackage, comma separated.',
      },
      {
        flags: '-n --rpc-url [url]',
        description: 'RPC endpoint to alter to',
      },
      {
        flags: '--provider-url [url]',
        description: '(DEPRECATED) RPC endpoint to fork off of. Use --rpc-url',
      },
      ...debugVerbosity,
    ],
  },
  fetch: {
    description: 'Fetch cannon package data from an IPFS hash and store it in the local registry.',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the Cannon package to fetch from (name:version@preset)',
      },
      {
        flags: '<ipfsHash>',
        description: 'IPFS hash to fetch deployment data from',
      },
    ],
    options: [
      {
        flags: '-c --chain-id <chainId>',
        description: 'Chain ID of deployment to fetch',
      },
      {
        flags: '--meta-hash <metaHash>',
        description: 'IPFS hash to fetch deployment metadata from',
      },
      ...debugVerbosity,
    ],
  },
  pin: {
    description: 'Upload cannon pacakge data to a remote registry by IPFS hash',
    arguments: [
      {
        flags: '<ipfsHash>',
        description: 'IPFS hash to write deployment data for',
      },
    ],
    options: [...debugVerbosity],
  },
  publish: {
    description:
      'Publish a Cannon package to the registry (Note that the registry collects some ETH, indicated in the CLI output, to support an IPFS cluster that automatically pins package data.)',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the Cannon package to publish (name:version@preset)',
      },
    ],
    options: [
      {
        flags: '-n --registry-rpc-url [url]',
        description: 'RPC endpoint to publish to',
      },
      {
        flags: '--registry-chain-id <number>',
        description: 'Registry chain id to publish to',
      },
      {
        flags: '--registry-address <address>',
        description: 'Registry address to publish to',
      },
      {
        flags: '--private-key <key>',
        description: 'Private key to use for publishing the registry package',
      },
      {
        flags: '--chain-id <chainId>',
        description: 'The chain ID of the package to publish',
      },
      {
        flags: '-t --tags <tags>',
        description: 'Comma separated list of labels for your package',
      },
      {
        flags: '--gas-limit <gasLimit>',
        description: 'The maximum units of gas spent for the registration transaction',
      },
      {
        flags: '--value <value>',
        description: 'Value in wei to send with the transaction',
      },
      {
        flags: '--max-fee-per-gas <maxFeePerGas>',
        description: 'The maximum value (in gwei) for the base fee when submitting the registry transaction',
      },
      {
        flags: '--max-priority-fee-per-gas <maxPriorityFeePerGas>',
        description: 'The maximum value (in gwei) for the miner tip when submitting the registry transaction',
      },
      {
        flags: '-q --quiet',
        description: 'Only output final JSON object at the end, no human readable output',
      },
      {
        flags: '--include-provisioned',
        description: '(DEPRECATED) Includes provisioned packages when publishing to the registry',
      },
      {
        flags: '--exclude-cloned',
        description: 'Excludes cloned packages when publishing to the registry',
      },
      {
        flags: '--skip-confirm',
        description: 'Skip confirmation and package selection prompts',
      },
      ...debugVerbosity,
    ],
  },
  unpublish: {
    description: 'Unpublish a Cannon package to the registry',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the Cannon package to unpublish (name:version@preset)',
      },
    ],
    options: [
      {
        flags: '-n --registry-rpc-url [url]',
        description: 'RPC endpoint to unpublish to',
      },
      {
        flags: '-c --registry-chain-id <number>',
        description: 'Registry chain id to unpublish to',
      },
      {
        flags: '--registry-address <address>',
        description: 'Registry address to unpublish to',
      },
      {
        flags: '--private-key <key>',
        description: 'Private key of the package owner',
      },
      {
        flags: '--chain-id <chainId>',
        description: 'The chain ID of the package to unpublish',
      },
      {
        flags: '-t --tags <tags>',
        description: 'Comma separated list of labels for your package',
      },
      {
        flags: '--gas-limit <gasLimit>',
        description: 'The maximum units of gas spent for the registration transaction',
      },
      {
        flags: '--value <value>',
        description: 'Value in wei to send with the transaction',
      },
      {
        flags: '--max-fee-per-gas <maxFeePerGas>',
        description: 'The maximum value (in gwei) for the base fee when submitting the registry transaction',
      },
      {
        flags: '--max-priority-fee-per-gas <maxPriorityFeePerGas>',
        description: 'The maximum value (in gwei) for the miner tip when submitting the registry transaction',
      },
      ...debugVerbosity,
    ],
  },
  register: {
    description: 'Register a Cannon package on the Cannon Registry',
    arguments: [
      {
        flags: '<packageRefs...>',
        description: 'List of packages you want to register on the Cannon Registry',
      },
    ],
    options: [
      {
        flags: '-n --registry-rpc-url [url]',
        description: 'RPC endpoint to register your package to',
      },
      {
        flags: '-c --registry-chain-id <chainId>',
        description: 'Chain ID of the package to register',
      },
      {
        flags: '-a --registry-address <address>',
        description: 'Custom address of the registry contract to register the package to',
      },
      {
        flags: '--private-key <key>',
        description: 'Private key to use for publishing the registry package',
      },
      {
        flags: '--skip-confirm',
        description: 'Skip confirmation to register the package',
      },
      {
        flags: '--gas-limit <gasLimit>',
        description: 'The maximum units of gas spent for the registration transaction',
      },
      {
        flags: '--value <value>',
        description: 'Value in wei to send with the transaction (defaults to registerFee)',
      },
      {
        flags: '--max-fee-per-gas <maxFeePerGas>',
        description: 'The maximum value (in gwei) for the base fee when submitting the registry transaction',
      },
      {
        flags: '--max-priority-fee-per-gas <maxPriorityFeePerGas>',
        description: 'The maximum value (in gwei) for the miner tip when submitting the registry transaction',
      },
      ...debugVerbosity,
    ],
  },
  publishers: {
    description: 'Add, remove or list publishers in your Cannon package',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the Cannon package (name:version@preset)',
      },
    ],
    options: [
      {
        flags: '-a --add <address>',
        description: 'Specify a comma separated list of addresses to add as publishers',
      },
      {
        flags: '-r --remove <address>',
        description: 'Specify a comma separated list of addresses to add as publishers',
      },
      {
        flags: '-l --list',
        description: 'List package publishers',
      },
      {
        flags: '-n --registry-rpc-url [url]',
        description: 'RPC endpoint to add a publisher to your package',
      },
      {
        flags: '-c --registry-chain-id <chainId>',
        description: 'Chain ID of the package to add a publisher to',
      },
      {
        flags: '--private-key <key>',
        description: 'Private key of the package owner',
      },
      {
        flags: '--optimism',
        description: 'Change publishers on the Optimism network',
      },
      {
        flags: '--mainnet',
        description: 'Change publishers on the Mainnet network',
      },
      {
        flags: '--skip-confirm',
        description: 'Skip confirmation to change the publishers',
      },
      {
        flags: '--gas-limit <gasLimit>',
        description: 'The maximum units of gas spent for the registration transaction',
      },
      {
        flags: '--value <value>',
        description: 'Value in wei to send with the transaction (defaults to registerFee)',
      },
      {
        flags: '--max-fee-per-gas <maxFeePerGas>',
        description: 'The maximum value (in gwei) for the base fee when submitting the registry transaction',
      },
      {
        flags: '--max-priority-fee-per-gas <maxPriorityFeePerGas>',
        description: 'The maximum value (in gwei) for the miner tip when submitting the registry transaction',
      },
      ...debugVerbosity,
    ],
  },
  inspect: {
    description: 'Inspect the details of a Cannon package',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the Cannon package to inspect (name:version@preset)',
      },
    ],
    options: [
      {
        flags: '-c --chain-id <chainId>',
        description: 'Chain ID of the variant to inspect',
      },
      {
        flags: '-j --json',
        description: 'Output as JSON',
      },
      {
        flags: '-w --write-deployments <writeDeployments>',
        description: 'Path to write the deployments data (address and ABIs), like "./deployments"',
      },
      {
        flags: '-q --quiet',
        description: 'Suppress extra logging',
      },
      {
        flags: '-s --sources',
        description: 'Show contract sources',
      },
      ...debugVerbosity,
    ],
  },
  prune: {
    description: 'Clean cannon storage of excessive/transient build files older than a certain age',
    options: [
      {
        flags: '--filter-package <packageRef>',
        description: 'Only keep deployments in local storage which match the given package name. Default: do not filter',
      },
      {
        flags: '--filter-variant <variant>',
        description: 'Only keep deployments which match the specifiec variant(s). Default: do not filter',
      },
      {
        flags: '--keep-age <seconds>',
        description: 'Number of seconds old a package must be before it should be deleted',
        defaultValue: '2592000',
      },
      {
        flags: '--dry-run',
        description: 'Print out information about prune without committing',
      },
      {
        flags: '-y --yes',
        description: 'Skip confirmation prompt',
      },
      ...debugVerbosity,
    ],
  },
  trace: {
    description:
      'Get a full stack trace for a transaction hash or explicit transaction call. This command will spin up a local fork and simulate the given transaction.',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the package to trace (name:version@preset)',
      },
      {
        flags: '<transactionHash OR bytes32Data>',
        description: 'bytes32 encoded transaction data to input to a function call, or transaction hash',
      },
    ],
    options: [
      {
        flags: '-c --chain-id <chainId>',
        description: 'Chain ID of the variant to trace',
      },
      {
        flags: '-f --from <source>',
        description: 'Caller for the transaction to trace',
      },
      {
        flags: '-t --to <target>',
        description: 'Contract which should be called',
      },
      {
        flags: '--value <value>',
        description: 'Amonut of gas token to send in the traced call',
      },
      {
        flags: '-b --block-number <value>',
        description: 'The block to simulate when the call is on',
      },
      {
        flags: '-n --rpc-url [url]',
        description: 'RPC endpoint to fork off of',
      },
      {
        flags: '--provider-url [url]',
        description: '(DEPRECATED) RPC endpoint to fork off of. Use --rpc-url',
      },
      {
        flags: '-j --json',
        description: 'Output as JSON',
      },
      ...debugVerbosity,
    ],
  },
  decode: {
    description:
      'Decode the given data using the ABIs from the specified Cannon package. It will try to parse the data as Function Call, Error or Event. If a tx hash is given it will fetch it using the rpc and try to parse the input.',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the package to decode from (name:version@preset)',
      },
      {
        flags: '<transactionHash OR hexData>',
        description: 'hex encoded transaction data or a transaction hash',
      },
    ],
    options: [
      {
        flags: '-c --chain-id <chainId>',
        description: 'Chain ID of the variant to inspect',
      },
      {
        flags: '-n --rpc-url [url]',
        description: 'RPC endpoint to decode on',
      },
      {
        flags: '--provider-url [url]',
        description: '(DEPRECATED) RPC endpoint to decode on',
      },
      {
        flags: '-j --json',
        description: 'Output as JSON',
      },
      ...debugVerbosity,
    ],
  },
  test: {
    description: 'Run forge tests on a cannon deployment. To pass arguments through to `forge test`, use `--`.',
    usage: '[cannonfile]',
    arguments: [
      {
        flags: '[cannonfile]',
        description: 'Path to a cannonfile',
        defaultValue: 'cannonfile.toml',
      },
      {
        flags: '[forge options...]',
        description: 'Additional options to send to forge',
      },
    ],
    options: [
      {
        flags: '-n --rpc-url [url]',
        description: 'RPC endpoint to fork off of',
      },
      {
        flags: '--provider-url [url]',
        description: '(DEPRECATED) RPC endpoint to fork off of. Use --rpc-url',
      },
      {
        flags: '-c --chain-id <chainId>',
        description: 'Chain ID to connect to and run fork tests with',
      },
      {
        flags: '--wipe',
        description: 'Clear the existing deployment state and start this deploy from scratch.',
      },
      {
        flags: '--upgrade-from [cannon-package:0.0.1]',
        description: 'Specify a package to use as a new base for the deployment.',
      },
      {
        flags: '--registry-priority <registry>',
        description: 'Change the default registry to read from first. Default: onchain',
      },
      {
        flags: '--forge-cmd <command>',
        description: 'Use an alternative forge call, such as "coverage"',
        defaultValue: 'test',
      },
      ...debugVerbosity,
    ],
    forgeOptions: forgeTestOptions,
  },
  interact: {
    description: 'Start an interactive terminal against a set of active cannon deployments',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the Cannon package to interact with (name:version@preset)',
      },
    ],
    options: [
      {
        flags: '-c --chain-id <chainId>',
        description: 'Chain ID of deployment to interact with ',
      },
      {
        flags: '-n --rpc-url [url]',
        description: 'RPC endpoint to execute the deployment on',
      },
      {
        flags: '--provider-url [url]',
        description: '(DEPRECATED) RPC endpoint to fork off of. Use --rpc-url',
      },
      {
        flags: '--mnemonic <phrase>',
        description: 'Use the specified mnemonic to initialize a chain of signers while running',
      },
      {
        flags: '--private-key [key]',
        description: 'Specify a comma separated list of private keys which may be needed to sign a transaction',
      },
      {
        flags: '--gas-price <gasPrice>',
        description: 'Specify a gas price to use for the deployment',
      },
      {
        flags: '--max-gas-fee <maxGasFee>',
        description: 'Specify max fee per gas (EIP-1559) for deployment',
      },
      {
        flags: '--max-priority-gas-fee <maxpriorityGasFee>',
        description: 'Specify max fee per gas (EIP-1559) for deployment',
      },
      ...debugVerbosity,
    ],
  },
  setup: {
    description: 'Initialize cannon settings file',
  },
  clean: {
    description: 'Delete packages cache directories',
    options: [
      {
        flags: '--no-confirm',
        description: 'Do not ask for confirmation before deleting',
      },
    ],
  },
  plugin: {
    description: 'Manage Cannon plug-in modules',
    commands: {
      list: {
        description: 'List all installed Cannon plug-ins',
      },
      add: {
        description: 'Add a Cannon plug-in',
        arguments: [
          {
            flags: '<name>',
            description: 'npm package name of the Cannon plug-in',
          },
        ],
      },
      remove: {
        description: 'Remove a Cannon plug-in',
        arguments: [
          {
            flags: '<name>',
            description: 'npm package name of the Cannon plug-in',
          },
        ],
      },
    },
  },
};

export default commandsConfig;
