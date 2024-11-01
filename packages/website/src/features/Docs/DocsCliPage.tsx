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

const basicCommands = ['run', 'build', 'verify', 'publish'];

interface CustomLinkProps {
  href: string;
  children: React.ReactNode;
}

const CustomLink: FC<CustomLinkProps> = ({ href, children }) => (
  <a
    href={href}
    className="block text-sm py-0.5 px-2 mb-0.5 rounded-md hover:bg-gray-800 cursor-pointer no-underline"
  >
    {children}
  </a>
);

interface LinkItem {
  href: string;
  text: string;
}

interface SectionProps {
  title: string;
  links: LinkItem[];
}

const Section: FC<SectionProps> = ({ title, links }) => (
  <div className="my-4">
    <h2 className="font-medium text-sm text-gray-200 tracking-wide px-2 mb-1.5">
      {title}
    </h2>
    <div className="mb-6">
      {links.map((link, index) => (
        <CustomLink key={index} href={link.href}>
          {link.text}
        </CustomLink>
      ))}
    </div>
  </div>
);

const CustomTable: React.FC<{
  title: string;
  data: { key: string; value: string }[];
}> = ({ title, data }) => (
  <div className="overflow-x-auto mb-4">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-gray-300 pl-0 border-gray-500">
            {title}
          </TableHead>
          <TableHead className="text-gray-300 border-gray-500">
            Description
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="pl-0 border-gray-500">
              <code className="bg-gray-800 px-1 py-0.5 rounded">{row.key}</code>
            </TableCell>
            <TableCell className="border-gray-500">{row.value}</TableCell>
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
      <CommandPreview backgroundColor="black" command={'cannon ' + command} />
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
              <a
                href="https://github.com/foundry-rs/foundry/tree/master/crates/anvil"
                className="text-blue-400 hover:text-blue-300"
              >
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
              <a
                href="https://github.com/foundry-rs/foundry/tree/master/crates/forge"
                className="text-blue-400 hover:text-blue-300"
              >
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
    <div className="flex flex-1 flex-col max-h-full max-w-full">
      <div className="flex flex-1 flex-col md:flex-row">
        <div className="flex flex-col overflow-y-auto max-w-full md:max-w-[240px] w-full md:w-[240px] max-h-[140px] md:max-h-[calc(100vh-151px)] border-b md:border-b-0 md:border-r border-gray-700">
          <div className="px-3 pb-2">
            <Section title="Installation" links={[]} />
            <Section
              title="Basic Commands"
              links={basicCommands.map((commandName) => ({
                href: `#${commandName.replaceAll(' ', '-')}`,
                text: commandName,
              }))}
            />
            <Section
              title="Advanced Commands"
              links={commandsData
                .filter((command) => !new Set(basicCommands).has(command.name))
                .map((command) => ({
                  href: `#${command.name.replaceAll(' ', '-')}`,
                  text: command.name,
                }))}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-none md:max-h-[calc(100vh-151px)] bg-gray-900">
          <div className="max-w-[1024px] ml-0 p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-4">
                Command-Line Interface Documentation
              </h1>
              <p className="mb-4">
                Cannon&apos;s command-line interface (CLI) allows users to
                deploy, upgrade, and configure protocols using cannonfiles with
                the <code className="bg-gray-700 px-1 rounded">build</code>{' '}
                command,{' '}
                <code className="bg-gray-700 px-1 rounded">publish</code> the
                resulting packages,{' '}
                <code className="bg-gray-700 px-1 rounded">run</code> packages
                locally, and more. Find the code for the CLI{' '}
                <a
                  href="https://github.com/usecannon/cannon/tree/main/packages/cli"
                  className="text-blue-400 hover:text-blue-300"
                >
                  on GitHub
                </a>
                .
              </p>
            </div>

            <div className="mb-16">
              <h2 className="text-2xl font-bold mb-4">Installation</h2>
              <p className="mb-3">
                <a
                  href="https://book.getfoundry.sh/getting-started/installation"
                  className="text-blue-400 hover:text-blue-300"
                >
                  Install Foundry
                </a>{' '}
                if you haven&apos;t already. Then, run one of the following
                commands in your terminal to install (or upgrade) Cannon:
              </p>

              <Tabs defaultValue="npm" className="mb-6">
                <TabsList className="mb-4 border-b border-gray-500">
                  <TabsTrigger
                    value="npm"
                    className="gap-2 font-medium data-[state=active]:text-red-500 data-[state=active]:border-b-2 data-[state=active]:border-red-500"
                  >
                    <NpmIcon className="text-red-500" /> npm
                  </TabsTrigger>
                  <TabsTrigger
                    value="yarn"
                    className="gap-2 font-medium data-[state=active]:text-blue-500 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                  >
                    <YarnIcon className="text-blue-500" /> yarn
                  </TabsTrigger>
                  <TabsTrigger
                    value="pnpm"
                    className="gap-2 font-medium data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500"
                  >
                    <PnpmIcon className="text-orange-500" /> pnpm
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="npm" className="p-0">
                  <CommandPreview
                    backgroundColor="black"
                    command="npm i -g @usecannon/cli"
                  />
                </TabsContent>
                <TabsContent value="yarn" className="p-0">
                  <CommandPreview
                    backgroundColor="black"
                    command="yarn global add @usecannon/cli"
                  />
                </TabsContent>
                <TabsContent value="pnpm" className="p-0">
                  <CommandPreview
                    backgroundColor="black"
                    command="pnpm add -g @usecannon/cli"
                  />
                </TabsContent>
              </Tabs>

              <p className="mb-4">
                Now you can use all of the following commands your terminal with{' '}
                <code className="bg-gray-700 px-1 rounded">
                  cannon &lt;command&gt;
                </code>
                . You can also use the CLI without installing it using npx:{' '}
                <code className="bg-gray-700 px-1 rounded">
                  npx @usecannon/cli &lt;command&gt;
                </code>
                . If no command is specified, the CLI will execute the{' '}
                <code className="bg-gray-700 px-1 rounded">run</code> command.
                The{' '}
                <a
                  href="https://github.com/usecannon/cannon/tree/main/packages/hardhat-cannon#readme"
                  className="text-blue-400 hover:text-blue-300"
                >
                  Hardhat plug-in
                </a>{' '}
                exposes some of the commands as Hardhat tasks.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-5">Basic Commands</h2>
              {basicCommands.map((commandName) =>
                renderCommandConfig(
                  commandsData.find((command) => command.name === commandName)
                )
              )}
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-5">Advanced Commands</h2>
              {commandsData
                .filter((command) => !new Set(basicCommands).has(command.name))
                .map((command) => renderCommandConfig(command))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsCliPage;
