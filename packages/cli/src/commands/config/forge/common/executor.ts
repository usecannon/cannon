import type { Option as ForgeExecutorOption } from '../../types';

export const forgeExecutorOptions: ForgeExecutorOption[] = [
  {
    flags: '--forge.base-fee <FEE>',
    description: 'The base fee in a block (in wei).',
  },
  {
    flags: '--forge.block-base-fee-per-gas <FEE>',
    description: 'The base fee per gas unit in a block (in wei).',
  },
  {
    flags: '--forge.block-coinbase <address>',
    description: 'The coinbase (miner) address of the block.',
  },
  {
    flags: '--forge.block-difficulty <difficulty>',
    description: 'The difficulty level of the block.',
  },
  {
    flags: '--forge.block-gas-limit <gas_limit>',
    description: 'The total gas limit of the block.',
  },
  {
    flags: '--forge.block-number <block>',
    description: 'The block number.',
  },
  {
    flags: '--forge.block-timestamp <timestamp>',
    description: 'The timestamp of the block (in seconds).',
  },
  {
    flags: '--forge.chain-id <chain_id>',
    description: 'The chain ID of the network.',
  },
  {
    flags: '--forge.gas-limit <gas_limit>',
    description: 'The gas limit for the transaction.',
  },
  {
    flags: '--forge.gas-price <gas_price>',
    description: 'The gas price (in wei) for the transaction.',
  },
  {
    flags: '--forge.tx-origin <address>',
    description: 'The origin address of the transaction.',
  },
];
