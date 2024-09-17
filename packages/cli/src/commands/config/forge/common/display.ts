import type { Option as ForgeDisplayOption } from '../../types';

export const forgeDisplayOptions: ForgeDisplayOption[] = [
  {
    flags: '--forge.json',
    description: 'Output test results in JSON format',
  },
  {
    flags: '--forge.list',
    description: 'List tests instead of running them',
  },
  {
    flags: '--forge.summary',
    description: 'Print test summary table',
  },
  {
    flags: '--forge.detailed',
    description: 'Print detailed test summary table',
  },
];
