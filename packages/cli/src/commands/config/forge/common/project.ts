import type { Option as ForgeProjectOption } from '../../types';

export const forgeProjectOptions: ForgeProjectOption[] = [
  {
    flags: '--forge.out <path>',
    description: 'The path to the contract artifacts folder.',
  },
  {
    flags: '--forge.revert-strings <revert>',
    description: 'Revert string configuration. [default, strip, debug, verboseDebug]',
  },
  {
    flags: '--forge.build-info',
    description: 'Generate build info files.',
  },
  {
    flags: '--forge.build-info-path <path>',
    description: 'Output path to directory where build info files will be written.',
  },
  {
    flags: '--forge.root <path>',
    description: "The project's root path.",
  },
  {
    flags: '--forge.contracts <path>',
    description: 'The contracts source directory.',
  },
  {
    flags: '--forge.remappings <remappings>',
    description: "The project's remappings, in the format <source>=<dest>.",
  },
  {
    flags: '--forge.remappings-env <env>',
    description: "The project's remappings from the environment.",
  },
  {
    flags: '--forge.cache-path <path>',
    description: 'The path to the compiler cache.',
  },
  {
    flags: '--forge.lib-paths <path>',
    description: 'The path to the library folder.',
  },
  {
    flags: '--forge.hardhat',
    description: 'Use the Hardhat-style project layout.',
  },
  {
    flags: '--forge.config-path <file>',
    description: 'Path to the config file.',
  },
];
