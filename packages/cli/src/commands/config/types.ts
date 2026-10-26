export type Option<T = string> = {
  flags: string;
  description: string;
  defaultValue?: T | T[];
  customFunction?: (value: T, previousValue: T) => T;
  alias?: string;
};

type Argument = {
  flags: string;
  description: string;
  defaultValue?: string | boolean | number | string[];
};

type BaseCommand = {
  description: string;
  usage?: string;
  arguments?: Argument[];
  options?: Option<any>[];
  anvilOptions?: Option[];
  forgeOptions?: Option[];
};

type SubCommand = BaseCommand;

export type Command = BaseCommand & {
  commands?: Record<string, SubCommand>;
};

type PluginCommand = Command & {
  commands: {
    list: SubCommand;
    add: SubCommand;
    remove: SubCommand;
  };
};

export type CommandsConfig = {
  [key: string]: Command;
  plugin: PluginCommand;
};
