import type { Option as ForgeBuildOption } from '../types.js';

import { forgeCompilerOptions } from './common/compiler.js';
import { forgeProjectOptions } from './common/project.js';

export const forgeBuildOptions: ForgeBuildOption[] = [
  {
    flags: '--forge.names',
    description: 'Print compiled contract names.',
  },
  {
    flags: '--forge.sizes',
    description: 'Print compiled non-test contract sizes, exiting with code 1 if any of them are above the size limit.',
  },
  {
    flags: '--forge.skip',
    description: 'Skip compilation of non-essential contract directories like test or script.',
  },
  ...forgeCompilerOptions,
  ...forgeProjectOptions,
];
