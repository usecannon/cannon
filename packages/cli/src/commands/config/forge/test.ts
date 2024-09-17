import type { Option as ForgeTestOption } from '../types';

import { anvilOptions } from '../anvil';
import { forgeEvmOptions } from './common/evm';
import { forgeDisplayOptions } from './common/display';
import { forgeCompilerOptions } from './common/compiler';
import { forgeProjectOptions } from './common/project';

export const forgeTestOptions: ForgeTestOption[] = [
  {
    flags: '--forge.debug <test_function>',
    description: 'Run a test in the debugger.',
  },
  {
    flags: '--forge.decode-internal [<test_function>]',
    description: 'Whether to identify internal functions in traces.',
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
    description: 'The Etherscan (or equivalent) API key.',
  },
  {
    flags: '--forge.fuzz-seed <fuzz_seed>',
    description: 'Set seed used to generate randomness during your fuzz runs.',
  },
  {
    flags: '--forge.fuzz-runs <runs>',
    description: 'Set the number of fuzz runs.',
  },
  {
    flags: '--forge.fuzz-input-file <fuzz_input_file>',
    description: 'File to rerun fuzz failures from.',
  },
  {
    flags: '--forge.threads <threads>',
    description: 'Max concurrent threads to use. Default value is the number of available CPUs.',
  },
  {
    flags: '--forge.show-progress',
    description: 'Show test execution progress.',
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
    flags: '--forge.no-match-coverage <regex>',
    description: 'Only show coverage for files that do not match the specified regex pattern.',
  },
  {
    flags: '--forge.rerun',
    description: 'Re-run recorded test failures from last run. If no failure recorded then regular test run is performed.',
  },
  ...forgeDisplayOptions,
  ...forgeEvmOptions,
  ...forgeCompilerOptions,
  ...forgeProjectOptions,
  ...anvilOptions,
];
