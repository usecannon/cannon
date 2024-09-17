import type { Option as AnvilOption } from './types';
import { ANVIL_PORT_DEFAULT_VALUE, ANVIL_CHAIN_ID_DEFAULT_VALUE } from '../../constants';

export const anvilOptions: AnvilOption[] = [
  {
    flags: '--anvil.port <number>',
    description: 'Port number to listen on. [default: 0]',
    defaultValue: ANVIL_PORT_DEFAULT_VALUE,
  },
  {
    flags: '--anvil.chain-id <number>',
    description: 'Set the chain id. [default: 13370]',
    defaultValue: ANVIL_CHAIN_ID_DEFAULT_VALUE,
  },
  {
    flags: '--anvil.compute-units-per-second [number]',
    description: 'Sets the number of assumed available compute units per second for this fork provider.',
  },
  {
    flags: '--anvil.fork-retry-backoff [number]',
    description: 'Initial retry backoff on encountering errors.',
  },
  {
    flags: '--anvil.no-rate-limit',
    description: "Disables rate limiting for this node's provider.",
  },
  {
    flags: '--anvil.no-storage-caching',
    description: 'Explicitly disables the use of RPC caching. All storage slots are read entirely from the endpoint.',
  },
  {
    flags: '--anvil.retries [number]',
    description: 'Number of retry requests for spurious networks (timed out requests).',
  },
  {
    flags: '--anvil.timeout [number]',
    description: 'Timeout in ms for requests sent to remote JSON-RPC server in forking mode.',
  },
  {
    flags: '--anvil.code-size-limit [number]',
    description: 'EIP-170: Contract code size limit in bytes. Useful to increase this because of tests.',
  },
  {
    flags: '--anvil.disable-block-gas-limit',
    description: 'Disable the call.gas_limit <= block.gas_limit constraint.',
  },
  {
    flags: '--anvil.gas-limit [number]',
    description: 'The block gas limit.',
  },
  {
    flags: '--anvil.accounts [number]',
    description: 'Number of dev accounts to generate and configure.',
  },
  {
    flags: '--anvil.balance [number]',
    description: 'The balance of every dev account in Ether.',
  },
  {
    flags: '--anvil.derivation-path [path]',
    description: 'Sets the derivation path of the child key to be derived.',
  },
  {
    flags: '--anvil.mnemonic [phrase]',
    description: 'BIP39 mnemonic phrase used for generating accounts.',
  },
  {
    flags: '--anvil.steps-tracing',
    description: 'Enable steps tracing used for debug calls returning geth-style traces.',
  },
  {
    flags: '--anvil.timestamp [number]',
    description: 'The timestamp of the genesis block.',
  },
  {
    flags: '--anvil.allow-origin [string]',
    description: 'Set the Access-Control-Allow-Origin response header (CORS).',
  },
  {
    flags: '--anvil.block-time [number]',
    description: 'Block time in seconds for interval mining.',
  },
  {
    flags: '--anvil.config-out [path]',
    description: 'Writes output of anvil as json to user-specified file.',
  },
  {
    flags: '--anvil.dump-state [path]',
    description: 'Dump the state of chain on exit to the given file.',
  },
  {
    flags: '--anvil.hardfork [type]',
    description: 'The EVM hardfork to use.',
  },
  {
    flags: '--anvil.host [string]',
    description: 'The host the server will listen on.',
  },
  {
    flags: '--anvil.init [path]',
    description: 'Initialize the genesis block with the given genesis.json file.',
  },
  {
    flags: '--anvil.ipc [path]',
    description: 'Launch an ipc server at the given path or default path = /tmp/anvil.ipc.',
  },
  {
    flags: '--anvil.load-state [path]',
    description: 'Initialize the chain from a previously saved state snapshot.',
  },
  {
    flags: '--anvil.no-cors',
    description: 'Disable CORS.',
  },
  {
    flags: '--anvil.no-mining',
    description: 'Disable auto and interval mining, and mine on demand instead.',
  },
  {
    flags: '--anvil.order [string]',
    description: 'How transactions are sorted in the mempool.',
  },
  {
    flags: '--anvil.prune-history [value]',
    description:
      "Don't keep full chain history. If a number argument is specified, at most this number of states is kept in memory.",
  },
  {
    flags: '--anvil.state-interval [number]',
    description: 'Interval in seconds at which the status is to be dumped to disk.',
  },
  {
    flags: '--anvil.state [path]',
    description:
      "Alias for both loadState and dumpState. Initializes the chain with the state stored at the file, if it exists, and dumps the chain's state on exit.",
  },
  {
    flags: '--anvil.transaction-block-keeper [number]',
    description: 'Number of blocks with transactions to keep in memory.',
  },
];

export const anviloptionsWithFork: AnvilOption[] = [
  ...anvilOptions,
  {
    flags: '--anvil.fork-url [url]',
    description: 'Fetch state over a remote endpoint instead of starting from an empty state.',
  },
  {
    flags: '--anvil.fork-block-number [number]',
    description: 'Fetch state from a specific block number over a remote endpoint.',
  },
  {
    flags: '--anvil.fork-chain-id [number]',
    description: 'Specify chain id to skip fetching it from remote endpoint.',
  },
];
