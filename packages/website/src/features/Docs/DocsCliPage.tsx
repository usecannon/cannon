'use client';

import { CommandPreview } from '@/components/CommandPreview';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Code,
  Container,
  Flex,
  Heading,
  Icon,
  Link,
  Tab,
  Table,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useBreakpointValue,
} from '@chakra-ui/react';
import commandsConfig from '@usecannon/cli/dist/src/commands/config';
import React, { FC } from 'react';
import { FaYarn } from 'react-icons/fa';
import { ImNpm } from 'react-icons/im';
import { SiPnpm } from 'react-icons/si';

const basicCommands = ['run', 'build', 'verify', 'publish'];

const commandsData: any[] = [];

const collectCommandsData = (config: any, parentName?: string) => {
  Object.entries(config).forEach(([k, v]) => {
    const name = parentName ? `${parentName} ${k}` : k;
    if ((v as any).commands) {
      collectCommandsData((v as any).commands, name);
    } else {
      commandsData.push({ ...(v as any), name });
    }
  });
};

collectCommandsData(commandsConfig);

interface CustomLinkProps {
  href: string;
  children: React.ReactNode;
}

const CustomLink: FC<CustomLinkProps> = ({ href, children }) => (
  <Link
    display="block"
    textDecoration="none"
    borderRadius="md"
    mb={0.5}
    py={0.5}
    px="2"
    cursor="pointer"
    fontSize="sm"
    _hover={{ background: 'gray.800' }}
    href={href}
  >
    {children}
  </Link>
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
  <Box my={4}>
    <Heading
      fontWeight="500"
      size="sm"
      color="gray.200"
      letterSpacing="0.1px"
      px="2"
      mb="1.5"
    >
      {title}
    </Heading>
    <Box mb={6}>
      {links.map((link, index) => (
        <CustomLink key={index} href={link.href}>
          {link.text}
        </CustomLink>
      ))}
    </Box>
  </Box>
);

const CustomTable: React.FC<{
  title: string;
  data: { key: string; value: string }[];
}> = ({ title, data }) => (
  <Box overflowX="auto" mb={4}>
    <Table variant="simple" size="sm">
      <Thead>
        <Tr>
          <Th color="gray.300" pl={0} borderColor="gray.500">
            {title}
          </Th>
          <Th color="gray.300" borderColor="gray.500">
            Description
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {data.map((row) => (
          <Tr key={row.key}>
            <Td pl={0} borderColor="gray.500">
              <Code>{row.key}</Code>
            </Td>
            <Td borderColor="gray.500">{row.value}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  </Box>
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
  <Box mb={16} id={id}>
    <Heading mb={4} fontSize="lg">
      <Code px={0} fontSize="lg">
        {id.replace('-', ' ')}
      </Code>
      <Link
        color="gray.300"
        ml={2}
        textDecoration="none"
        _hover={{ textDecoration: 'underline' }}
        href={'#' + id}
      >
        #
      </Link>
    </Heading>
    <Text mb={2} fontSize="lg">
      {description}
    </Text>
    <Box mb={5}>
      <CommandPreview backgroundColor="black" command={'cannon ' + command} />
    </Box>
    {argumentsData && <CustomTable title="Argument" data={argumentsData} />}
    {optionsData && <CustomTable title="Option" data={optionsData} />}
    {anvilOptionsData && (
      <Accordion allowToggle>
        <AccordionItem border="none">
          <h2>
            <AccordionButton px={0}>
              <Button
                fontWeight={500}
                size="sm"
                colorScheme="white"
                variant="outline"
                letterSpacing="0.1px"
                rightIcon={<AccordionIcon />}
              >
                Anvil Options
              </Button>
            </AccordionButton>
          </h2>
          <AccordionPanel p={0}>
            <Text mt={2} mb={4}>
              Cannon uses an{' '}
              <Link
                isExternal
                href="https://github.com/foundry-rs/foundry/tree/master/crates/anvil"
              >
                Anvil
              </Link>{' '}
              to execute this command. The following options can also be passed
              through to the Anvil process:
            </Text>
            <CustomTable title="Option" data={anvilOptionsData} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    )}
    {forgeOptionsData && (
      <Accordion allowToggle>
        <AccordionItem border="none">
          <h2>
            <AccordionButton px={0}>
              <Button
                fontWeight={500}
                size="sm"
                colorScheme="white"
                variant="outline"
                letterSpacing="0.1px"
                rightIcon={<AccordionIcon />}
              >
                Forge Options
              </Button>
            </AccordionButton>
          </h2>
          <AccordionPanel p={0}>
            <Text mt={2} mb={4}>
              Cannon uses{' '}
              <Link
                isExternal
                href="https://github.com/foundry-rs/foundry/tree/master/crates/forge"
              >
                Forge
              </Link>{' '}
              to execute this command. The following options can also be passed
              through to the Forge process:
            </Text>
            <CustomTable title="Option" data={forgeOptionsData} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    )}
  </Box>
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

export const DocsCliPage: FC = () => {
  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  return (
    <Flex flex="1" direction="column" maxHeight="100%" maxWidth="100%">
      <Flex flex="1" direction={['column', 'column', 'row']}>
        <Flex
          flexDirection="column"
          overflowY="auto"
          maxWidth={['100%', '100%', '240px']}
          borderRight={isSmall ? 'none' : '1px solid'}
          borderBottom={isSmall ? '1px solid' : 'none'}
          borderColor={isSmall ? 'gray.600' : 'gray.700'}
          width={['100%', '100%', '240px']}
          maxHeight={['140px', '140px', 'calc(100vh - 151px)']}
        >
          <Box px={3} pb={2}>
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
          </Box>
        </Flex>

        <Box
          flex="1"
          overflowY="auto"
          maxHeight={['none', 'none', 'calc(100vh - 151px)']}
          background="gray.800"
        >
          <Container maxW="container.lg" ml={0} p={8}>
            <Box mb={8}>
              <Heading fontSize="3xl" mb={4}>
                Command-Line Interface Documentation
              </Heading>
              <Text mb={4}>
                Cannon’s command-line interface (CLI) allows users to deploy,
                upgrade, and configure protocols using cannonfiles with the{' '}
                <Code>build</Code> command, <Code>publish</Code> the resulting
                packages, <Code>run</Code> packages locally, and more. Find the
                code for the CLI{' '}
                <Link
                  isExternal
                  href="https://github.com/usecannon/cannon/tree/main/packages/cli"
                >
                  on GitHub
                </Link>
                .
              </Text>
            </Box>
            <Box mb={16}>
              <Heading fontSize="2xl" mb={4}>
                Installation
              </Heading>
              <Text mb="3">
                <Link
                  isExternal
                  href="https://book.getfoundry.sh/getting-started/installation"
                >
                  Install Foundry
                </Link>{' '}
                if you haven’t already. Then, run one of the following commands
                in your terminal to install (or upgrade) Cannon:
              </Text>

              <Tabs mb="6">
                <TabList mb={4} borderBottomColor="gray.500">
                  <Tab
                    gap="2"
                    fontWeight="medium"
                    _selected={{
                      color: 'red.500',
                      borderBottomWidth: '2px',
                      borderBottomColor: 'red.500',
                    }}
                    _active={{ background: 'whiteAlpha.100' }}
                  >
                    <Icon as={ImNpm} color="red.500" /> npm
                  </Tab>
                  <Tab
                    gap="2"
                    fontWeight="medium"
                    _selected={{
                      color: 'blue.500',
                      borderBottomWidth: '2px',
                      borderBottomColor: 'blue.500',
                    }}
                    _active={{ background: 'whiteAlpha.100' }}
                  >
                    <Icon as={FaYarn} fontSize="lg" color="blue.500" /> yarn
                  </Tab>
                  <Tab
                    gap="2"
                    fontWeight="medium"
                    _selected={{
                      color: 'orange.500',
                      borderBottomWidth: '2px',
                      borderBottomColor: 'orange.500',
                    }}
                    _active={{ background: 'whiteAlpha.100' }}
                  >
                    <Icon as={SiPnpm} color="orange.500" /> pnpm
                  </Tab>
                </TabList>
                <TabPanels>
                  <TabPanel p="0">
                    <CommandPreview
                      backgroundColor="black"
                      command="npm i -g @usecannon/cli"
                    />
                  </TabPanel>
                  <TabPanel p="0">
                    <CommandPreview
                      backgroundColor="black"
                      command="yarn global add @usecannon/cli"
                    />
                  </TabPanel>
                  <TabPanel p="0">
                    <CommandPreview
                      backgroundColor="black"
                      command="pnpm add -g @usecannon/cli"
                    />
                  </TabPanel>
                </TabPanels>
              </Tabs>

              <Text mb={4}>
                Now you can use all of the following commands your terminal with{' '}
                <Code>{'cannon <command>'}</Code>. You can also use the CLI
                without installing it using npx:{' '}
                <Code>{'npx @usecannon/cli <command>'}</Code>. If no command is
                specified, the CLI will execute the <Code>run</Code> command.
                The{' '}
                <Link
                  isExternal
                  href="https://github.com/usecannon/cannon/tree/main/packages/hardhat-cannon#readme"
                >
                  Hardhat plug-in
                </Link>{' '}
                exposes some of the commands as Hardhat tasks.
              </Text>
            </Box>

            <Box mb={8}>
              <Heading fontSize="2xl" mb={5}>
                Basic Commands
              </Heading>
              {basicCommands.map((commandName) =>
                renderCommandConfig(
                  commandsData.find((command) => command.name === commandName)
                )
              )}
            </Box>

            <Box mb={8}>
              <Heading fontSize="2xl" mb={5}>
                Advanced Commands
              </Heading>
              {commandsData
                .filter((command) => !new Set(basicCommands).has(command.name))
                .map((command) => renderCommandConfig(command))}
            </Box>
          </Container>
        </Box>
      </Flex>
    </Flex>
  );
};
