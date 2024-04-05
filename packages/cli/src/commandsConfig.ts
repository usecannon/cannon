const anvilOptions = [
  {
    flags: '-p --port <number>',
    description: 'Port which the JSON-RPC server will be exposed.',
    defaultValue: '0', // https://www.lifewire.com/port-0-in-tcp-and-udp-818145
  },
  {
    flags: '-c --chain-id <number>',
    description: 'The chain id to run against',
  },
  {
    flags: '--compute-units-per-second [number]',
    description: 'Sets the number of assumed available compute units per second for this fork provider.',
  },
  {
    flags: '--fork-url [url]',
    description: 'Fetch state over a remote endpoint instead of starting from an empty state.',
  },
  {
    flags: '--fork-block-number [number]',
    description: 'Fetch state from a specific block number over a remote endpoint.',
  },
  {
    flags: '--fork-chain-id [number]',
    description: 'Specify chain id to skip fetching it from remote endpoint.',
  },
  {
    flags: '--fork-retry-backoff [number]',
    description: 'Initial retry backoff on encountering errors.',
  },
  {
    flags: '--no-rate-limit',
    description: "Disables rate limiting for this node's provider.",
  },
  {
    flags: '--no-storage-caching',
    description: 'Explicitly disables the use of RPC caching. All storage slots are read entirely from the endpoint.',
  },
  {
    flags: '--retries [number]',
    description: 'Number of retry requests for spurious networks (timed out requests).',
  },
  {
    flags: '--timeout [number]',
    description: 'Timeout in ms for requests sent to remote JSON-RPC server in forking mode.',
  },
  {
    flags: '--block-base-fee-per-gas [number]',
    description: 'The base fee in a block.',
  },
  {
    flags: '--code-size-limit [number]',
    description: 'EIP-170: Contract code size limit in bytes. Useful to increase this because of tests.',
  },
  {
    flags: '--disable-block-gas-limit',
    description: 'Disable the call.gas_limit <= block.gas_limit constraint.',
  },
  {
    flags: '--gas-limit [number]',
    description: 'The block gas limit.',
  },
  {
    flags: '--gas-price [number]',
    description: 'The gas price.',
  },
  {
    flags: '--accounts [number]',
    description: 'Number of dev accounts to generate and configure.',
  },
  {
    flags: '--balance [number]',
    description: 'The balance of every dev account in Ether.',
  },
  {
    flags: '--derivation-path [path]',
    description: 'Sets the derivation path of the child key to be derived.',
  },
  {
    flags: '--mnemonic [phrase]',
    description: 'BIP39 mnemonic phrase used for generating accounts.',
  },
  {
    flags: '--steps-tracing',
    description: 'Enable steps tracing used for debug calls returning geth-style traces.',
  },
  {
    flags: '--timestamp [number]',
    description: 'The timestamp of the genesis block.',
  },
  {
    flags: '--allow-origin [string]',
    description: 'Set the Access-Control-Allow-Origin response header (CORS).',
  },
  {
    flags: '--block-time [number]',
    description: 'Block time in seconds for interval mining.',
  },
  {
    flags: '--config-out [path]',
    description: 'Writes output of anvil as json to user-specified file.',
  },
  {
    flags: '--dump-state [path]',
    description: 'Dump the state of chain on exit to the given file.',
  },
  {
    flags: '--hardfork [type]',
    description: 'The EVM hardfork to use.',
  },
  {
    flags: '--host [string]',
    description: 'The host the server will listen on.',
  },
  {
    flags: '--init [path]',
    description: 'Initialize the genesis block with the given genesis.json file.',
  },
  {
    flags: '--ipc [path]',
    description: 'Launch an ipc server at the given path or default path = /tmp/anvil.ipc.',
  },
  {
    flags: '--load-state [path]',
    description: 'Initialize the chain from a previously saved state snapshot.',
  },
  {
    flags: '--no-cors',
    description: 'Disable CORS.',
  },
  {
    flags: '--no-mining',
    description: 'Disable auto and interval mining, and mine on demand instead.',
  },
  {
    flags: '--order [string]',
    description: 'How transactions are sorted in the mempool.',
  },
  {
    flags: '--prune-history [value]',
    description:
      "Don't keep full chain history. If a number argument is specified, at most this number of states is kept in memory.",
  },
  {
    flags: '--state-interval [number]',
    description: 'Interval in seconds at which the status is to be dumped to disk.',
  },
  {
    flags: '--state [path]',
    description:
      "Alias for both loadState and dumpState. Initializes the chain with the state stored at the file, if it exists, and dumps the chain's state on exit.",
  },
  {
    flags: '--transaction-block-keeper [number]',
    description: 'Number of blocks with transactions to keep in memory.',
  },
];

const commandsConfig = {
  run: {
    description: 'Utility for instantly loading cannon packages in standalone contexts',
    usage: '[global options] ...[<name>[:<semver>] ...[<key>=<value>]]',
    arguments: [
      {
        flags: '<packageRefs...>',
        description: 'List of packages to load, optionally with custom settings for each one',
      },
    ],
    anvilOptions: anvilOptions,
    options: [
      {
        flags: '-n --provider-url [url]',
        description: 'RPC endpoint to fork off of',
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
        flags: '--preset <preset>',
        description: 'Load an alternate setting preset',
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
        defaultValue: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
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
    ],
  },
  build: {
    description: 'Build a package from a Cannonfile',
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
    anvilOptions: anvilOptions,
    options: [
      {
        flags: '-n --provider-url [url]',
        description: 'RPC endpoint to execute the deployment on',
      },
      {
        flags: '-c --chain-id <number>',
        description: 'The chain id to run against',
      },
      {
        flags: '-p --preset <preset>',
        description:
          '(DEPRECATED) The preset label for storing the build with the given settings. Declare a preset in your cannonfile instead.',
      },
      {
        flags: '--dry-run',
        description: 'Simulate building on a local fork rather than deploying on the real network',
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
        description: 'Specify a package to use as a new base for the deployment.',
      },
      {
        flags: '--registry-priority <registry>',
        description: 'Change the default registry to read from first. Default: onchain',
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
      {
        flags: '--skip-compile',
        description: 'Skip the compilation step and use the existing artifacts',
      },
      {
        flags: '--write-script <writeScript>',
        description: '(Experimental) Path to write all the actions taken as a script that can be later executed',
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
    ],
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
        defaultValue: '1',
      },
      {
        flags: '-p --preset <preset>',
        description: '(DEPRECATED) Preset of the deployment to verify',
      },
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
        flags: '-n --provider-url [url]',
        description: 'RPC endpoint to alter to',
      },
      {
        flags: '-p --preset <preset>',
        description: '(DEPRECATED) Preset of the deployment to alter',
      },
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
  },
  publish: {
    description: 'Publish a Cannon package to the registry',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the Cannon package to publish (name:version@preset)',
      },
    ],
    options: [
      {
        flags: '-n --registry-provider-url [url]',
        description: 'RPC endpoint to publish to',
      },
      {
        flags: '--private-key <key>',
        description: 'Private key to use for publishing the registry package',
      },
      {
        flags: '--chain-id <number>',
        description: 'The chain ID of the package to publish',
      },
      {
        flags: '--preset <preset>',
        description: 'The preset of the packages to publish',
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
        description: 'Includes provisioned packages when publishing to the registry',
      },
      {
        flags: '--skip-confirm',
        description: 'Skip confirmation and package selection prompts',
      },
    ],
  },
  register: {
    description: 'Register a Cannon package on the main registry',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the Cannon package to publish (name:version@preset)',
      },
    ],
    options: [
      {
        flags: '-n --registry-provider-url [url]',
        description: 'RPC endpoint to publish to',
      },
      {
        flags: '--private-key <key>',
        description: 'Private key to use for publishing the registry package',
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
        defaultValue: '13370',
      },
      {
        flags: '-p --preset <preset>',
        description: '(DEPRECATED) Preset of the variant to inspect',
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
    ],
  },
  trace: {
    description: 'Get a full stack trace for a transaction hash or explicit transaction call',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the package to trace (name:version@preset)',
      },
      {
        flags: '<transactionHash OR bytes32Data>',
        description: 'base 16 encoded transaction data to input to a function call, or transaction hash',
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
        flags: '-v --value <value>',
        description: 'Amonut of gas token to send in the traced call',
      },
      {
        flags: '-b --block-number <value>',
        description: 'The block to simulate when the call is on',
      },
      {
        flags: '-p --preset <preset>',
        description: '(DEPRECATED) Preset of the variant to trace',
      },
      {
        flags: '-n --provider-url [url]',
        description: 'RPC endpoint to fork off of',
      },
      {
        flags: '-j --json',
        description: 'Output as JSON',
      },
    ],
  },
  decode: {
    description: 'decode transaction data using the ABIs of the given Cannon package',
    arguments: [
      {
        flags: '<packageRef>',
        description: 'Name, version and preset of the package to decode from (name:version@preset)',
      },
      {
        flags: '<bytes32Data...>',
        description: 'bytes32 encoded transaction data to decode',
      },
    ],
    options: [
      {
        flags: '-c --chain-id <chainId>',
        description: 'Chain ID of the variant to inspect',
        defaultValue: '13370',
      },
      {
        flags: '-p --preset <preset>',
        description: '(DEPRECATED) Preset of the variant to inspect',
      },
      {
        flags: '-j --json',
        description: 'Output as JSON',
      },
    ],
  },
  test: {
    description: 'Run forge tests on a cannon deployment. To pass arguments through to `forge test`, use `--`.',
    usage: '[cannonfile] [-- forge options...]',
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
        flags: '-n --provider-url [url]',
        description: 'RPC endpoint to fork off of',
      },
      {
        flags: '-c --chain-id',
        description: 'Chain ID to connect to and run fork tests with',
      },
      {
        flags: '-p --preset <preset>',
        description: '(DEPRECATED) The preset label for storing the build with the given settings',
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
    ],
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
        flags: '-n --provider-url [url]',
        description: 'RPC endpoint to execute the deployment on',
      },
      {
        flags: '-p --preset <preset>',
        description: '(DEPRECATED) Load an alternate setting preset',
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
