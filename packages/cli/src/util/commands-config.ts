import { Command } from 'commander';
import { createCommandHelp } from './create-command-help';
import { parsePackageArguments, parsePackagesArguments } from './params';
import type { Command as CommandConfig } from '../commands/config/types';

export const applyCommandsConfig = (command: Command, config: CommandConfig) => {
  if (config.description) {
    command.description(config.description);
  }

  if (config.usage) {
    command.usage(config.usage);
  }

  if (config.arguments) {
    config.arguments.map((argument: any) => {
      if (argument.flags === '<packageRefs...>') {
        command.argument(argument.flags, argument.description, parsePackagesArguments, argument.defaultValue);
      } else if (command.name() === 'interact' && argument.flags === '<packageRef>') {
        command.argument(argument.flags, argument.description, parsePackageArguments, argument.defaultValue);
      } else {
        command.argument(argument.flags, argument.description, argument.defaultValue);
      }
    });
  }

  // add command options to the command
  if (config.options) {
    config.options.forEach((option: any) => {
      option.required
        ? command.requiredOption(option.flags, option.description, option.defaultValue)
        : command.option(option.flags, option.description, option.defaultValue);
    });
  }

  // add anvil options to the command
  if (config.anvilOptions) {
    config.anvilOptions.forEach((option: any) => {
      option.required
        ? command.requiredOption(option.flags, option.description, option.defaultValue)
        : command.option(option.flags, option.description, option.defaultValue);
    });
  }

  // add forge options to the command
  if (config.forgeOptions) {
    config.forgeOptions.forEach((option: any) => {
      option.required
        ? command.requiredOption(option.flags, option.description, option.defaultValue)
        : command.option(option.flags, option.description, option.defaultValue);
    });
  }

  // override the help output to add a header for anvil and forge options
  const originalHelpInformation = command.helpInformation.bind(command);
  command.helpInformation = () => {
    let helpText = originalHelpInformation();
    helpText = createCommandHelp(helpText);
    return helpText;
  };

  return command;
};
