'use client';

import { CommandPreview } from '@/components/CommandPreview';
import { CustomSpinner } from '@/components/CustomSpinner';
import { useCommandsConfig } from '@/hooks/useCommandsConfig';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  SiNpm as NpmIcon,
  SiYarn as YarnIcon,
  SiPnpm as PnpmIcon,
} from 'react-icons/si';
import React, { FC } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';

const basicCommands = ['run', 'build', 'verify', 'publish'];

const CustomTable: React.FC<{
  title: string;
  data: { key: string; value: string }[];
}> = ({ title, data }) => (
  <div className="overflow-x-auto mb-4">
    <Table>
      <TableHeader>
        <TableRow className="border-border">
          <TableHead className="text-gray-300 pl-0 border-border">
            {title}
          </TableHead>
          <TableHead className="text-gray-300 border-border">
            Description
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.key} className="border-border">
            <TableCell className="pl-0 border-border">
              <code>{row.key}</code>
            </TableCell>
            <TableCell className="border-border">{row.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const DocumentationSection: React.FC<{
  id: string;
  command: string;
  description: string;
  argumentsData?: { key: string; value: string }[];
  anvilOptionsData?: { key: string; value: string }[];
  forgeOptionsData?: { key: string; value: string }[];
  optionsData?: { key: string; value: string }[];
}> = ({
  id,
  command,
  description,
  argumentsData,
  anvilOptionsData,
  forgeOptionsData,
  optionsData,
}) => (
  <div className="mb-16" id={id}>
    <div className="mb-4 text-lg">
      <code className="text-lg">{id.replace('-', ' ')}</code>
      <a
        className="text-gray-300 ml-2 no-underline hover:underline"
        href={'#' + id}
      >
        #
      </a>
    </div>
    <p className="mb-2 text-lg">{description}</p>
    <div className="mb-5">
      <CommandPreview>cannon {command}</CommandPreview>
    </div>
    {argumentsData && <CustomTable title="Argument" data={argumentsData} />}
    {optionsData && <CustomTable title="Option" data={optionsData} />}
    {anvilOptionsData && (
      <Accordion type="single" collapsible>
        <AccordionItem value="anvil-options" className="border-none">
          <AccordionTrigger className="px-0">
            <Button
              variant="outline"
              size="sm"
              className="font-medium tracking-wide"
            >
              Anvil Options
            </Button>
          </AccordionTrigger>
          <AccordionContent className="p-0">
            <p className="mt-2 mb-4">
              Cannon uses an{' '}
              <a href="https://github.com/foundry-rs/foundry/tree/master/crates/anvil">
                Anvil
              </a>{' '}
              to execute this command. The following options can also be passed
              through to the Anvil process:
            </p>
            <CustomTable title="Option" data={anvilOptionsData} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )}
    {forgeOptionsData && (
      <Accordion type="single" collapsible>
        <AccordionItem value="forge-options" className="border-none">
          <AccordionTrigger className="px-0">
            <Button
              variant="outline"
              size="sm"
              className="font-medium tracking-wide"
            >
              Forge Options
            </Button>
          </AccordionTrigger>
          <AccordionContent className="p-0">
            <p className="mt-2 mb-4">
              Cannon uses{' '}
              <a href="https://github.com/foundry-rs/foundry/tree/master/crates/forge">
                Forge
              </a>{' '}
              to execute this command. The following options can also be passed
              through to the Forge process:
            </p>
            <CustomTable title="Option" data={forgeOptionsData} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )}
  </div>
);

const renderCommandConfig = (commandConfig: any) => {
  const id = commandConfig.name.replaceAll(' ', '-');

  let options: any[] | undefined;
  if (commandConfig.anvilOptions) {
    options = [...commandConfig.anvilOptions];
  }
  if (commandConfig.options) {
    options = options
      ? [...options, ...commandConfig.options]
      : [...commandConfig.options];
  }

  return (
    <DocumentationSection
      key={id}
      id={id}
      command={
        commandConfig.usage
          ? `${commandConfig.name} ${commandConfig.usage}`
          : `${commandConfig.name}${options ? ' [options]' : ''}${
              commandConfig.arguments
                ? commandConfig.arguments.reduce(
                    (acc: string, argument: any) => `${acc} ${argument.flags}`,
                    ''
                  )
                : ''
            }`
      }
      description={commandConfig.description}
      argumentsData={
        commandConfig.arguments &&
        commandConfig.arguments.map((argument: any) => ({
          key: argument.flags,
          value:
            argument.description +
            (argument.defaultValue
              ? ` (default: "${argument.defaultValue}")`
              : ''),
        }))
      }
      anvilOptionsData={
        commandConfig.anvilOptions &&
        commandConfig.anvilOptions.map((option: any) => ({
          key: option.flags,
          value:
            option.description +
            (option.defaultValue ? ` (default: "${option.defaultValue}")` : ''),
        }))
      }
      forgeOptionsData={
        commandConfig.forgeOptions &&
        commandConfig.forgeOptions.map((option: any) => ({
          key: option.flags,
          value:
            option.description +
            (option.defaultValue ? ` (default: "${option.defaultValue}")` : ''),
        }))
      }
      optionsData={
        commandConfig.options &&
        commandConfig.options.map((option: any) => ({
          key: option.flags,
          value:
            option.description +
            (option.defaultValue ? ` (default: "${option.defaultValue}")` : ''),
        }))
      }
    />
  );
};

const DocsCliPage: FC = () => {
  const { commandsData, isLoading, error } = useCommandsConfig();

  if (isLoading) {
    return <CustomSpinner className="m-auto" />;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="flex flex-1">
      <div className="container max-w-4xl flex-1">
        <SidebarProvider>
          {/* Mobile trigger */}
          <div className="sticky top-0 z-40 md:hidden">
            <div className="flex h-14 items-center py-4">
              <SidebarTrigger>
                <Button variant="ghost" size="sm" className="-ml-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open sidebar</span>
                </Button>
              </SidebarTrigger>
            </div>
          </div>

          <div className="md:grid md:grid-cols-[160px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10 h-full">
            {/* Sidebar */}
            <Sidebar className="fixed top-14 z-30 -ml-2 hidden w-full shrink-0 md:sticky md:block md:top-0 md:border-none">
              <SidebarContent className="py-6 lg:py-8 bg-black">
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <a href="#installation">Installation</a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                  <SidebarGroupLabel>Basic Commands</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {basicCommands.map((commandName) => (
                        <SidebarMenuItem key={commandName}>
                          <SidebarMenuButton asChild>
                            <a href={`#${commandName}`}>{commandName}</a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                  <SidebarGroupLabel>Advanced Commands</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {commandsData
                        .filter(
                          (command) => !new Set(basicCommands).has(command.name)
                        )
                        .map((command) => (
                          <SidebarMenuItem key={command.name}>
                            <SidebarMenuButton asChild>
                              <a href={`#${command.name.replaceAll(' ', '-')}`}>
                                {command.name}
                              </a>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            {/* Main content */}
            <main className="flex w-full flex-col py-10">
              <div className="max-w-[1024px]">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-4">
                    Command-Line Interface Documentation
                  </h1>
                  <p className="mb-4">
                    Cannon&apos;s command-line interface (CLI) allows users to
                    deploy, upgrade, and configure protocols using cannonfiles
                    with the <code>build</code> command, <code>publish</code>{' '}
                    the resulting packages, <code>run</code> packages locally,
                    and more. Find the code for the CLI{' '}
                    <a href="https://github.com/usecannon/cannon/tree/main/packages/cli">
                      on GitHub
                    </a>
                    .
                  </p>
                </div>

                <div className="mb-16">
                  <h2 className="text-2xl font-bold mb-4">Installation</h2>
                  <p className="mb-3">
                    <a href="https://book.getfoundry.sh/getting-started/installation">
                      Install Foundry
                    </a>{' '}
                    if you haven&apos;t already. Then, run one of the following
                    commands in your terminal to install (or upgrade) Cannon:
                  </p>

                  <Tabs defaultValue="npm" className="mb-6">
                    <TabsList className="mb-4">
                      <TabsTrigger value="npm" className="gap-2">
                        <NpmIcon className="text-red-500" /> npm
                      </TabsTrigger>
                      <TabsTrigger value="yarn" className="gap-2">
                        <YarnIcon className="text-blue-500" /> yarn
                      </TabsTrigger>
                      <TabsTrigger value="pnpm" className="gap-2">
                        <PnpmIcon className="text-orange-500" /> pnpm
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="npm" className="p-0">
                      <CommandPreview>npm i -g @usecannon/cli</CommandPreview>
                    </TabsContent>
                    <TabsContent value="yarn" className="p-0">
                      <CommandPreview>
                        yarn global add @usecannon/cli
                      </CommandPreview>
                    </TabsContent>
                    <TabsContent value="pnpm" className="p-0">
                      <CommandPreview>
                        pnpm add -g @usecannon/cli
                      </CommandPreview>
                    </TabsContent>
                  </Tabs>

                  <p className="mb-4">
                    Now you can use all of the following commands your terminal
                    with{' '}
                    <code className="bg-gray-700 px-1 rounded">
                      cannon &lt;command&gt;
                    </code>
                    . You can also use the CLI without installing it using npx:{' '}
                    <code className="bg-gray-700 px-1 rounded">
                      npx @usecannon/cli &lt;command&gt;
                    </code>
                    . If no command is specified, the CLI will execute the{' '}
                    <code className="bg-gray-700 px-1 rounded">run</code>{' '}
                    command. The{' '}
                    <a href="https://github.com/usecannon/cannon/tree/main/packages/hardhat-cannon#readme">
                      Hardhat plug-in
                    </a>{' '}
                    exposes some of the commands as Hardhat tasks.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-5">Basic Commands</h2>
                  {basicCommands.map((commandName) =>
                    renderCommandConfig(
                      commandsData.find(
                        (command) => command.name === commandName
                      )
                    )
                  )}
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-5">Advanced Commands</h2>
                  {commandsData
                    .filter(
                      (command) => !new Set(basicCommands).has(command.name)
                    )
                    .map((command) => renderCommandConfig(command))}
                </div>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
};

export default DocsCliPage;
