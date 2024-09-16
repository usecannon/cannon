import type { Option as ForgeTestOption } from '../types';

import { forgeEvmOptions } from './common/evm';
import { forgeCompilerOptions } from './common/compiler';
import { forgeProjectOptions } from './common/project';

export const forgeTestOptions: ForgeTestOption[] = [
  {
    flags: '--forge.match <regex>',
    description: 'Only run test functions matching the specified regex pattern. Deprecated: See --forge.match-test.',
  },
  {
    flags: '--forge.match-test <regex>',
    description: 'Only run test functions matching the specified regex pattern.',
  },
  {
    flags: '--forge.no-match-test <regex>',
    description: 'Only run test functions that do not match the specified regex pattern.',
  },
  {
    flags: '--forge.match-contract <regex>',
    description: 'Only run tests in contracts matching the specified regex pattern.',
  },
  {
    flags: '--forge.no-match-contract <regex>',
    description: 'Only run tests in contracts that do not match the specified regex pattern.',
  },
  {
    flags: '--forge.match-path <glob>',
    description: 'Only run tests in source files matching the specified glob pattern.',
  },
  {
    flags: '--forge.no-match-path <glob>',
    description: 'Only run tests in source files that do not match the specified glob pattern.',
  },
  {
    flags: '--forge.debug <regex>',
    description:
      'Run a test in the debugger. The argument passed is the name of the test function. If more than one test matches, use --forge.match-contract or --forge.match-path to filter.',
  },
  {
    flags: '--forge.gas-report',
    description: 'Print a gas report.',
  },
  {
    flags: '--forge.allow-failure',
    description: 'Exit with code 0 even if a test fails.',
  },
  {
    flags: '--forge.fail-fast',
    description: 'Stop running tests after the first failure.',
  },
  {
    flags: '--forge.etherscan-api-key <key>',
    description: 'Etherscan API key for trace decoding (requires --forge.fork-url).',
  },
  {
    flags: '--forge.force',
    description: 'Clear the cache and artifacts folder and recompile.',
  },
  {
    flags: '--forge.libraries <libraries>',
    description: 'Set pre-linked libraries.',
  },
  {
    flags: '--forge.json',
    description: 'Print the deployment information as JSON.',
  },
  {
    flags: '--forge.list',
    description: 'List tests instead of running them.',
  },
  ...forgeEvmOptions,
  ...forgeCompilerOptions,
  ...forgeProjectOptions,
];
