export type Option = {
  flags: string;
  description: string;
  defaultValue?: string | boolean | string[];
};

type Argument = {
  flags: string;
  description: string;
  defaultValue?: string | boolean | string[];
};

type BaseCommand = {
  description: string;
  usage?: string;
  arguments?: Argument[];
  options?: Option[];
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
