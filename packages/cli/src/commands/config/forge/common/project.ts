import type { Option as ForgeProjectOption } from '../../types';

export const forgeProjectOptions: ForgeProjectOption[] = [
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
    description: 'The project’s root path.',
  },
  {
    flags: '--forge.contracts <path>',
    description: 'The contracts source directory.',
  },
  {
    flags: '--forge.lib-paths <path>',
    description: 'The path to the library folder.',
  },
  {
    flags: '--forge.remappings <remappings>',
    description: 'The project’s remappings, in the format <source>=<dest>.',
  },
  {
    flags: '--forge.cache-path <path>',
    description: 'The path to the compiler cache.',
  },
  {
    flags: '--forge.config-path <file>',
    description: 'Path to the config file.',
  },
  {
    flags: '--forge.out <path>',
    description: 'The project’s artifacts directory.',
  },
  {
    flags: '--forge.silent',
    description: 'Suppress all output.',
  },
];
