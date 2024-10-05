import type { Option as DebugOption } from './types';

export const debugVerbosity: DebugOption[] = [
  {
    flags: '-v',
    description: 'Print logs for builder, equivalent to DEBUG=cannon:builder',
  },
  {
    flags: '-vv',
    description:
      'Print logs for builder and its definition section, equivalent to DEBUG=cannon:builder, cannon:builder:definition',
  },
  {
    flags: '-vvv',
    description: 'Print logs for builder and its all sub sections, equivalent to DEBUG=cannon:builder*',
  },
  {
    flags: '-vvvv',
    description: 'Print all cannon logs, equivalent to DEBUG=cannon:*',
  },
];
