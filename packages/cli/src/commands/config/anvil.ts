import type { Option as AnvilOption } from './types';
import { ANVIL_PORT_DEFAULT_VALUE } from '../../constants';

const anvilServerOptions: AnvilOption[] = [
  {
    flags: '--anvil.allow-origin <string>',
    description: 'The cors `allow_origin` header',
  },
  {
    flags: '--anvil.host <string>',
    description: 'The hosts the server will listen on',
  },
  {
    flags: '--anvil.no-cors',
    description: 'Disable CORS',
  },
  {
    flags: '--anvil.no-request-size-limit',
    description: 'Disable the default request body size limit. At time of writing the default limit is 2MB',
  },
];

const anvilForkOptions: AnvilOption[] = [
  {
    flags: '--anvil.compute-units-per-second <number>',
    description: 'Sets the number of assumed available compute units per second for this provider',
  },
  {
    flags: '--anvil.fork-url <url>',
    description: 'Fetch state over a remote endpoint instead of starting from an empty state.',
  },
  {
    flags: '--anvil.fork-block-number <number>',
    description: 'Fetch state from a specific block number over a remote endpoint.',
  },
  {
    flags: '--anvil.fork-chain-id <number>',
    description: 'Specify chain id to skip fetching it from remote endpoint. This enables offline-start mode.',
  },
  {
    flags: '--anvil.fork-header <string>',
    description: 'Headers to use for the rpc client, e.g. "User-Agent: test-agent"',
  },
  {
    flags: '--anvil.fork-retry-backoff <number>',
    description: 'Initial retry backoff on encountering errors.',
  },
  {
    flags: '--anvil.fork-transaction-hash <string>',
    description: 'Fetch state from a specific transaction hash over a remote endpoint.',
  },
  {
    flags: '--anvil.no-rate-limit',
    description: "Disables rate limiting for this node's provider.",
  },
  {
    flags: '--anvil.no-storage-caching',
    description: 'Explicitly disables the use of RPC caching.',
  },
  {
    flags: '--anvil.retries <number>',
    description: 'Number of retry requests for spurious networks (timed out requests)',
  },
  {
    flags: '--anvil.timeout <number>',
    description: 'Timeout in ms for requests sent to remote JSON-RPC server in forking mode.',
  },
];

const anvilEnvironmentOptions: AnvilOption[] = [
  {
    flags: '--anvil.block-base-fee-per-gas <number>',
    description: 'The base fee in a block',
  },
  {
    flags: '--anvil.chain-id <number>',
    description: 'The chain ID [default: 13370]',
  },
  {
    flags: '--anvil.code-size-limit <number>',
    description: 'EIP-170: Contract code size limit in bytes. Useful to increase this because of tests.',
  },
  {
    flags: '--anvil.disable-block-gas-limit',
    description: 'Disable the `call.gas_limit <= block.gas_limit` constraint',
  },
  {
    flags: '--anvil.disable-code-size-limit',
    description: 'Disable EIP-170: Contract code size limit',
  },
  {
    flags: '--anvil.gas-limit <number>',
    description: 'The block gas limit',
  },
  {
    flags: '--anvil.gas-price <number>',
    description: 'The gas price',
  },
];

const anvilEVMOptions: AnvilOption[] = [
  {
    flags: '--anvil.alphanet',
    description: 'Enable Alphanet features',
  },
  {
    flags: '--anvil.auto-impersonate',
    description: 'Enable autoImpersonate on startup',
  },
  {
    flags: '--anvil.disable-console-log',
    description: 'Disable printing of `console.log` invocations to stdout',
  },
  {
    flags: '--anvil.disable-default-create2-deployer',
    description: 'Disable the default create2 deployer',
  },
  {
    flags: '--anvil.memory-limit <number>',
    description: 'The memory limit per EVM execution in bytes',
  },
  {
    flags: '--anvil.optimism',
    description: 'Run an Optimism chain',
  },
  {
    flags: '--anvil.steps-tracing',
    description: 'Enable steps tracing used for debug calls returning geth-style traces',
  },
];

export const anvilOptions: AnvilOption[] = [
  {
    flags: '--anvil.accounts <number>',
    description: 'Number of dev accounts to generate and configure',
  },
  {
    flags: '--anvil.block-time <number>',
    description: 'Block time in seconds for interval mining',
  },
  {
    flags: '--anvil.balance <number>',
    description: 'The balance of every dev account in Ether',
  },
  {
    flags: '--anvil.config-out <path>',
    description: 'Writes output of `anvil` as json to user-specified file',
  },
  {
    flags: '--anvil.derivation-path <path>',
    description: 'Sets the derivation path of the child key to be derived.',
  },
  {
    flags: '--anvil.dump-state <path>',
    description: 'Dump the state and block environment of chain on exit to the given file.',
  },
  {
    flags: '--anvil.hardfork <string>',
    description: 'The EVM hardfork to use.',
  },
  {
    flags: '--anvil.init <path>',
    description: 'Initialize the genesis block with the given `genesis.json` file',
  },
  {
    flags: '--anvil.ipc [<path>]',
    description: 'Launch an ipc server at the given path or default path = `/tmp/anvil.ipc`',
  },
  {
    flags: '--anvil.load-state <path>',
    description: 'Initialize the chain from a previously saved state snapshot',
  },
  {
    flags: '--anvil.mnemonic <string>',
    description:
      'BIP39 mnemonic phrase used for generating accounts. Cannot be used if `mnemonic_random` or `mnemonic_seed` are used',
  },
  {
    flags: '--anvil.max-persisted-states <number>',
    description: 'Max number of states to persist on disk.',
  },
  {
    flags: '--anvil.mixed-mining',
    description: 'Enable mixed mining',
  },
  {
    flags: '--anvil.mnemonic-random [<number>]',
    description:
      'Automatically generates a BIP39 mnemonic phrase, and derives accounts from it. Cannot be used with other `mnemonic` options.',
  },
  {
    flags: '--anvil.mnemonic-seed-unsafe <string>',
    description: 'Generates a BIP39 mnemonic phrase from a given seed. Cannot be used with other `mnemonic` options.',
  },
  {
    flags: '--anvil.no-mining',
    description: 'Disable auto and interval mining, and mine on demand instead',
  },
  {
    flags: '--anvil.order <string>',
    description: 'How transactions are sorted in the mempool',
  },
  {
    flags: '--anvil.port <number>',
    description: 'Port number to listen on [default: 0]',
    defaultValue: ANVIL_PORT_DEFAULT_VALUE,
  },
  {
    flags: '--anvil.preserve-historical-states',
    description: 'Preserve historical state snapshots when dumping the state.',
  },
  {
    flags: '--anvil.prune-history <number>',
    description:
      "Don't keep full chain history. If a number argument is specified, at most this number of states is kept in memory.",
  },
  {
    flags: '--anvil.state-interval <number>',
    description: 'Interval in seconds at which the state and block environment is to be dumped to disk.',
  },
  {
    flags: '--anvil.silent',
    description: "Don't print anything on startup and don't print logs",
  },
  {
    flags: '--anvil.slots-in-an-epoch <number>',
    description: 'Slots in an epoch',
  },
  {
    flags: '--anvil.state <path>',
    description: 'This is an alias for both --load-state and --dump-state.',
  },
  {
    flags: '--anvil.timestamp <number>',
    description: 'The timestamp of the genesis block',
  },
  {
    flags: '--anvil.transaction-block-keeper <number>',
    description: 'Number of blocks with transactions to keep in memory',
  },
  {
    flags: '--anvil.version',
    description: 'Print version',
  },
  ...anvilServerOptions,
  ...anvilForkOptions,
  ...anvilEnvironmentOptions,
  ...anvilEVMOptions,
];
