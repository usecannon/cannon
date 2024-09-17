import type { Option as ForgeEVMOption } from '../../types';

export const forgeEvmOptions: ForgeEVMOption[] = [
  {
    flags: '--forge.rpc-url <url>',
    description: 'Fetch state over a remote endpoint instead of starting from an empty state.',
  },
  {
    flags: '--forge.fork-url <url>',
    description:
      'Fetch state over a remote endpoint. If you want to fetch state from a specific block number, see --forge.fork-block-number.',
  },
  {
    flags: '--forge.fork-block-number <block>',
    description: 'Fetch state from a specific block number over a remote endpoint.',
  },
  {
    flags: '--forge.fork-retry-backoff <BACKOFF>',
    description: 'Initial retry backoff on encountering errors.',
  },
  {
    flags: '--forge.no-storage-caching',
    description: 'Explicitly disables the use of RPC caching. All storage slots are read entirely from the endpoint.',
  },
  {
    flags: '--forge.v',
    description: 'Verbosity of the EVM. First level of verbosity.',
    alias: '-v',
  },
  {
    flags: '--forge.vv',
    description: 'Verbosity of the EVM. Print logs for all tests.',
    alias: '-vv',
  },
  {
    flags: '--forge.vvv',
    description: 'Verbosity of the EVM. Print execution traces for failing tests.',
    alias: '-vvv',
  },
  {
    flags: '--forge.vvvv',
    description: 'Verbosity of the EVM. Print execution traces for all tests, and setup traces for failing tests',
    alias: '-vvvv',
  },
  {
    flags: '--forge.vvvvv',
    description: 'Verbosity of the EVM. Print execution and setup traces for all tests',
    alias: '-vvvvv',
  },
  {
    flags: '--forge.sender <address>',
    description: 'The address which will be executing tests.',
  },
  {
    flags: '--forge.initial-balance <balance>',
    description: 'The initial balance of deployed contracts.',
  },
  {
    flags: '--forge.ffi',
    description: 'Enables the FFI cheatcode.',
  },
];
