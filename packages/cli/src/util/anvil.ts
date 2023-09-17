import _ from 'lodash';
import { Command } from 'commander';

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

export function addAnvilOptions(command: Command): Command {
  return command
    .option('-p --port <number>', 'Port which the JSON-RPC server will be exposed.', '8545')
    .option('-c --chain-id <number>', 'The chain id to run against')
    .option(
      '--compute-units-per-second [number]',
      'Sets the number of assumed available compute units per second for this fork provider.'
    )
    .option('--fork-url [url]', 'Fetch state over a remote endpoint instead of starting from an empty state.')
    .option('--fork-block-number [number]', 'Fetch state from a specific block number over a remote endpoint.')
    .option('--fork-chain-id [number]', 'Specify chain id to skip fetching it from remote endpoint.')
    .option('--fork-retry-backoff [number]', 'Initial retry backoff on encountering errors.')
    .option('--no-rate-limit', "Disables rate limiting for this node's provider.")
    .option(
      '--no-storage-caching',
      'Explicitly disables the use of RPC caching. All storage slots are read entirely from the endpoint.'
    )
    .option('--retries [number]', 'Number of retry requests for spurious networks (timed out requests).')
    .option('--timeout [number]', 'Timeout in ms for requests sent to remote JSON-RPC server in forking mode.')
    .option('--block-base-fee-per-gas [number]', 'The base fee in a block.')
    .option(
      '--code-size-limit [number]',
      'EIP-170: Contract code size limit in bytes. Useful to increase this because of tests.'
    )
    .option('--disable-block-gas-limit', 'Disable the call.gas_limit <= block.gas_limit constraint.')
    .option('--gas-limit [number]', 'The block gas limit.')
    .option('--gas-price [number]', 'The gas price.')
    .option('--accounts [number]', 'Number of dev accounts to generate and configure.')
    .option('--balance [number]', 'The balance of every dev account in Ether.')
    .option('--derivation-path [path]', 'Sets the derivation path of the child key to be derived.')
    .option('--mnemonic [phrase]', 'BIP39 mnemonic phrase used for generating accounts.')
    .option('--steps-tracing', 'Enable steps tracing used for debug calls returning geth-style traces.')
    .option('--timestamp [number]', 'The timestamp of the genesis block.')
    .option('--allow-origin [string]', 'Set the Access-Control-Allow-Origin response header (CORS).')
    .option('--block-time [number]', 'Block time in seconds for interval mining.')
    .option('--config-out [path]', 'Writes output of anvil as json to user-specified file.')
    .option('--dump-state [path]', 'Dump the state of chain on exit to the given file.')
    .option('--hardfork [type]', 'The EVM hardfork to use.')
    .option('--host [string]', 'The host the server will listen on.')
    .option('--init [path]', 'Initialize the genesis block with the given genesis.json file.')
    .option('--ipc [path]', 'Launch an ipc server at the given path or default path = /tmp/anvil.ipc.')
    .option('--load-state [path]', 'Initialize the chain from a previously saved state snapshot.')
    .option('--no-cors', 'Disable CORS.')
    .option('--no-mining', 'Disable auto and interval mining, and mine on demand instead.')
    .option('--order [string]', 'How transactions are sorted in the mempool.')
    .option(
      '--prune-history [value]',
      "Don't keep full chain history. If a number argument is specified, at most this number of states is kept in memory."
    )
    .option('--state-interval [number]', 'Interval in seconds at which the status is to be dumped to disk.')
    .option(
      '--state [path]',
      "Alias for both loadState and dumpState. Initializes the chain with the state stored at the file, if it exists, and dumps the chain's state on exit."
    )
    .option('--transaction-block-keeper [number]', 'Number of blocks with transactions to keep in memory.');
}
