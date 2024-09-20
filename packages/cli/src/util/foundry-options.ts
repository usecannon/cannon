import _ from 'lodash';
import { Option } from '../commands/config/types';
import { anvilOptions } from '../commands/config/anvil';
import { forgeTestOptions } from '../commands/config/forge/test';
import { forgeBuildOptions } from '../commands/config/forge/build';

enum FoundryFlagPrefix {
  FORGE = 'forge.',
  ANVIL = 'anvil.',
}

// convert kebab-case to camelCase
const toCamelCase = (str: string): string => str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

// normalize flag by removing leading dashes and tool prefixes
const normalizeFlag = (flag: string): string =>
  flag.replace(/^-+/, '').replace(new RegExp(`^(${Object.values(FoundryFlagPrefix).join('|')})`), '');

// pick and normalize foundry options based on prefixes and valid options
const pickFoundryOptions = (
  prefix: FoundryFlagPrefix,
  options: Record<string, any>,
  cannonOptions: Option[]
): Record<string, any> => {
  const validKeys = cannonOptions.reduce((accum, curr) => {
    if (curr.flags.startsWith(`--${prefix}`)) {
      accum.push(toCamelCase(normalizeFlag(curr.flags.split(' ')[0])));
    }
    return accum;
  }, [] as string[]);

  const formattedOptions = Object.fromEntries(Object.entries(options).map(([key, value]) => [normalizeFlag(key), value]));

  return _.pick(formattedOptions, validKeys);
};

// helper functions to pick options for specific Foundry tools
export const pickForgeBuildOptions = (options: Record<string, any>): Record<string, any> =>
  pickFoundryOptions(FoundryFlagPrefix.FORGE, options, forgeBuildOptions);

export const pickForgeTestOptions = (options: Record<string, any>): Record<string, any> =>
  pickFoundryOptions(FoundryFlagPrefix.FORGE, options, forgeTestOptions);

export const pickAnvilOptions = (options: Record<string, any>): Record<string, any> =>
  pickFoundryOptions(FoundryFlagPrefix.ANVIL, options, anvilOptions);

// convert foundry options to command-line arguments
export const fromFoundryOptionsToArgs = (options: Record<string, any>, commandOptions: Option[]): string[] => {
  return Object.entries(options).flatMap(([key, value]) => {
    const option = commandOptions.find((opt) => {
      return toCamelCase(normalizeFlag(opt.flags.split(' ')[0])) === normalizeFlag(key);
    });

    if (!option) return [];

    const flag = option.alias || `--${normalizeFlag(option.flags.split(' ')[0])}`;
    return typeof value === 'boolean' ? [flag] : [flag, value.toString()];
  });
};
