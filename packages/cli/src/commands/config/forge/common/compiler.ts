import type { Option as ForgeCompilerOption } from '../../types';

export const forgeCompilerOptions: ForgeCompilerOption[] = [
  {
    flags: '--forge.optimize',
    description: 'Activate the Solidity optimizer.',
  },
  {
    flags: '--forge.optimizer-runs <runs>',
    description: 'The number of optimizer runs.',
  },
  {
    flags: '--forge.via-ir',
    description: 'Use the Yul intermediate representation compilation pipeline.',
  },
  {
    flags: '--forge.revert-strings <strategy>',
    description: 'How to treat revert and require reason strings.',
  },
  {
    flags: '--forge.use <solc_version>',
    description: 'Specify the solc version, or a path to a local solc, to build with.',
  },
  {
    flags: '--forge.offline',
    description: 'Do not access the network. Missing solc versions will not be installed.',
  },
  {
    flags: '--forge.no-auto-detect',
    description: 'Do not auto-detect solc.',
  },
  {
    flags: '--forge.ignored-error-codes <error_codes>',
    description: 'Ignore solc warnings by error code. Comma-separated list of error codes.',
  },
  {
    flags: '--forge.extra-output <selector>',
    description: 'Extra output to include in the contract’s artifact.',
  },
  {
    flags: '--forge.extra-output-files <selector>',
    description: 'Extra output to write to separate files.',
  },
  {
    flags: '--forge.evm-version <version>',
    description: 'The target EVM version.',
  },
];
