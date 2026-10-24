import type { Option as DebugOption } from './types.js';

function increaseVerbosity(_value: number, previous: number) {
  return previous + 1;
}

export const debugVerbosity: DebugOption<number>[] = [
  {
    flags: '-v',
    description: `
Specifying this argument multiple times will increase verbosity. Guide:
    -v: Print logs for builder, equivalent to DEBUG=cannon:builder
    -vv: Print logs for builder and its definition section, equivalent to DEBUG=cannon:builder, cannon:builder:definition
    -vvv: Print logs for builder and its all sub sections, equivalent to DEBUG=cannon:builder*
    -vvvv: Print all cannon logs, equivalent to DEBUG=cannon:*

`,
    defaultValue: 0,
    customFunction: increaseVerbosity,
  },
];
