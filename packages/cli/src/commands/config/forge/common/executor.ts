import type { Option as ForgeExecutorOption } from '../../types';

export const forgeExecutorOptions: ForgeExecutorOption[] = [
  {
    flags: '--gas-limit <gas_limit>',
    description: 'The block gas limit',
  },
  {
    flags: '--code-size-limit <code_size>',
    description:
      'EIP-170: Contract code size limit in bytes. Useful to increase this because of tests. By default, it is 0x6000 (~25kb)',
  },
  {
    flags: '--chain <chain>',
    description: 'The chain name or EIP-155 chain ID',
  },
  {
    flags: '--gas-price <gas_price>',
    description: 'The gas price',
  },
  {
    flags: '--block-base-fee-per-gas <fee>',
    description: 'The base fee in a block',
  },
  {
    flags: '--tx-origin <address>',
    description: 'The transaction origin',
  },
  {
    flags: '--block-coinbase <address>',
    description: 'The coinbase of the block',
  },
  {
    flags: '--block-timestamp <timestamp>',
    description: 'The timestamp of the block',
  },
  {
    flags: '--block-number <block>',
    description: 'The block number',
  },
  {
    flags: '--block-difficulty <difficulty>',
    description: 'The block difficulty',
  },
  {
    flags: '--block-prevrandao <prevrandao>',
    description: 'The block prevrandao value. NOTE: Before merge this field was mix_hash',
  },
  {
    flags: '--block-gas-limit <gas_limit>',
    description: 'The block gas limit',
  },
  {
    flags: '--memory-limit <memory_limit>',
    description:
      'The memory limit per EVM execution in bytes. If this limit is exceeded, a `MemoryLimitOOG` result is thrown',
  },
  {
    flags: '--disable-block-gas-limit',
    description: 'Whether to disable the block gas limit checks',
  },
  {
    flags: '--isolate',
    description:
      'Whether to enable isolation of calls. In isolation mode all top-level calls are executed as a separate transaction in a separate EVM context, enabling more precise gas accounting and transaction state changes',
  },
  {
    flags: '--alphanet',
    description: 'Whether to enable Alphanet features',
  },
];
