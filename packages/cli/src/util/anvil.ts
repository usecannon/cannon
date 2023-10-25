import _ from 'lodash';

export type Hardfork =
  | 'Frontier'
  | 'Homestead'
  | 'Dao'
  | 'Tangerine'
  | 'SpuriousDragon'
  | 'Byzantium'
  | 'Constantinople'
  | 'Petersburg'
  | 'Istanbul'
  | 'Muirglacier'
  | 'Berlin'
  | 'London'
  | 'ArrowGlacier'
  | 'GrayGlacier'
  | 'Paris'
  | 'Shanghai'
  | 'Latest';

export type AnvilOptions = {
  /**
   * Sets the number of assumed available compute units per second for this fork provider.
   *
   * @defaultValue 350
   * @see https://github.com/alchemyplatform/alchemy-docs/blob/master/documentation/compute-units.md#rate-limits-cups
   */
  computeUnitsPerSecond?: number | undefined;
  /**
   * Fetch state over a remote endpoint instead of starting from an empty state.
   *
   * If you want to fetch state from a specific block number, add a block number like `http://localhost:8545@1400000`
   * or use the `forkBlockNumber` option.
   */
  forkUrl?: string | undefined;
  /**
   * Fetch state from a specific block number over a remote endpoint.
   *
   * Requires `forkUrl` to be set.
   */
  forkBlockNumber?: string | undefined;
  /**
   * Specify chain id to skip fetching it from remote endpoint. This enables offline-start mode.
   *
   * You still must pass both `forkUrl` and `forkBlockNumber`, and already have your required state cached
   * on disk, anything missing locally would be fetched from the remote.
   */
  forkChainId?: number | undefined;
  /**
   * Initial retry backoff on encountering errors.
   */
  forkRetryBackoff?: number | undefined;
  /**
   * Disables rate limiting for this node's provider.
   *
   * @defaultValue false
   * @see https://github.com/alchemyplatform/alchemy-docs/blob/master/documentation/compute-units.md#rate-limits-cups
   */
  noRateLimit?: boolean | undefined;
  /**
   * Explicitly disables the use of RPC caching.
   *
   * All storage slots are read entirely from the endpoint.
   */
  noStorageCaching?: boolean | undefined;
  /**
   * Number of retry requests for spurious networks (timed out requests).
   *
   * @defaultValue 5
   */
  retries?: number | undefined;
  /**
   * Timeout in ms for requests sent to remote JSON-RPC server in forking mode.
   *
   * @defaultValue 45000
   */
  timeout?: number | undefined;
  /**
   * The base fee in a block.
   */
  blockBaseFeePerGas?: number | bigint | undefined;
  /**
   * The chain id.
   */
  chainId?: number | undefined;
  /**
   * EIP-170: Contract code size limit in bytes. Useful to increase this because of tests.
   *
   * @defaultValue 0x6000 (~25kb)
   */
  codeSizeLimit?: number | undefined;
  /**
   * Disable the `call.gas_limit <= block.gas_limit` constraint.
   */
  disableBlockGasLimit?: boolean | undefined;
  /**
   * The block gas limit.
   */
  gasLimit?: number | bigint | undefined;
  /**
   * The gas price.
   */
  gasPrice?: number | bigint | undefined;
  /**
   * Number of dev accounts to generate and configure.
   *
   * @defaultValue 10
   */
  accounts?: number | undefined;
  /**
   * The balance of every dev account in Ether.
   *
   * @defaultValue 10000
   */
  balance?: number | bigint | undefined;
  /**
   * Sets the derivation path of the child key to be derived.
   *
   * @defaultValue m/44'/60'/0'/0/
   */
  derivationPath?: string | undefined;
  /**
   * BIP39 mnemonic phrase used for generating accounts.
   */
  mnemonic?: string | undefined;
  /**
   * Port number to listen on.
   *
   * @defaultValue 8545
   */
  port?: number | undefined;
  /**
   * Enable steps tracing used for debug calls returning geth-style traces.
   */
  stepsTracing?: boolean | undefined;
  /**
   * The timestamp of the genesis block.
   */
  timestamp?: number | bigint | undefined;
  /**
   * Set the Access-Control-Allow-Origin response header (CORS).
   *
   * @defaultValue *
   */
  allowOrigin?: string | undefined;
  /**
   * Block time in seconds for interval mining.
   */
  blockTime?: number | undefined;
  /**
   * Writes output of `anvil` as json to user-specified file.
   */
  configOut?: string | undefined;
  /**
   * Dump the state of chain on exit to the given file. If the value is a directory, the state will be
   * written to `<VALUE>/state.json`.
   */
  dumpState?: string | undefined;
  /**
   * The EVM hardfork to use.
   */
  hardfork?: Hardfork | undefined;
  /**
   * The host the server will listen on.
   */
  host?: string | undefined;
  /**
   * Initialize the genesis block with the given `genesis.json` file.
   */
  init?: string | undefined;
  /**
   * Launch an ipc server at the given path or default path = `/tmp/anvil.ipc`.
   */
  ipc?: string | undefined;
  /**
   * Initialize the chain from a previously saved state snapshot.
   */
  loadState?: string | undefined;
  /**
   * Disable CORS.
   */
  noCors?: boolean | undefined;
  /**
   * Disable auto and interval mining, and mine on demand instead.
   */
  noMining?: boolean | undefined;
  /**
   * How transactions are sorted in the mempool.
   *
   * @defaultValue fees
   */
  order?: string | undefined;
  /**
   * Don't keep full chain history. If a number argument is specified, at most this number of states is kept in memory.
   */
  pruneHistory?: number | undefined | boolean;
  /**
   * Interval in seconds at which the status is to be dumped to disk.
   */
  stateInterval?: number | undefined;
  /**
   * This is an alias for both `loadState` and `dumpState`. It initializes the chain with the state stored at the
   * file, if it exists, and dumps the chain's state on exit
   */
  state?: string | undefined;
  /**
   * Number of blocks with transactions to keep in memory.
   */
  transactionBlockKeeper?: number | undefined;
};

const anvilOptionKeys = [
  'computeUnitsPerSecond',
  'forkUrl',
  'forkBlockNumber',
  'forkChainId',
  'forkRetryBackoff',
  'noRateLimit',
  'noStorageCaching',
  'retries',
  'timeout',
  'blockBaseFeePerGas',
  'chainId',
  'codeSizeLimit',
  'disableBlockGasLimit',
  'gasLimit',
  'gasPrice',
  'accounts',
  'balance',
  'derivationPath',
  'mnemonic',
  'port',
  'stepsTracing',
  'timestamp',
  'allowOrigin',
  'blockTime',
  'configOut',
  'dumpState',
  'hardfork',
  'host',
  'init',
  'ipc',
  'loadState',
  'noCors',
  'noMining',
  'order',
  'pruneHistory',
  'stateInterval',
  'state',
  'transactionBlockKeeper',
] satisfies (keyof AnvilOptions)[];

export function pickAnvilOptions(obj: object) {
  return _.pick(obj, anvilOptionKeys) as AnvilOptions;
}

export const anvilOptions = [
  {
    flags: '-p --port <number>',
    description: 'Port which the JSON-RPC server will be exposed.',
    defaultValue: '8545',
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
