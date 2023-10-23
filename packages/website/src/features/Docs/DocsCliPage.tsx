'use client';

import { CommandPreview } from '@/components/CommandPreview';
import {
  Flex,
  Box,
  useBreakpointValue,
  Container,
  Heading,
  Link,
  Text,
  Code,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Icon,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import React, { FC } from 'react';
import { ImNpm } from 'react-icons/im';
import { FaYarn } from 'react-icons/fa';
import { SiPnpm } from 'react-icons/si';

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
  optionsData?: { key: string; value: string }[];
}> = ({ id, command, description, argumentsData, optionsData }) => (
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
  </Box>
);

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
              links={[
                { href: '#run', text: 'run' },
                { href: '#setup', text: 'setup' },
                { href: '#build', text: 'build' },
                { href: '#verify', text: 'verify' },
                { href: '#publish', text: 'publish' },
              ]}
            />
            <Section
              title="Advanced Commands"
              links={[
                { href: '#inspect', text: 'inspect' },
                { href: '#interact', text: 'interact' },
                { href: '#trace', text: 'trace' },
                { href: '#decode', text: 'decode' },
                { href: '#test', text: 'test' },
                { href: '#clean', text: 'clean' },
                { href: '#prune', text: 'prune' },
                { href: '#alter', text: 'alter' },
                { href: '#plugin-list', text: 'plugin list' },
                { href: '#plugin-add', text: 'plugin add' },
                { href: '#plugin-remove', text: 'plugin remove' },
              ]}
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
                Run one of the following commands in your terminal to install
                (or upgrade) Cannon:
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

              <DocumentationSection
                id="run"
                command="run [global options] ...[<name>[:<semver>] ...[<key>=<value>]]"
                description="Utility for instantly loading cannon packages in standalone contexts."
                argumentsData={[
                  {
                    key: 'packageNames',
                    value:
                      'List of packages to load, optionally with custom settings for each one',
                  },
                ]}
                optionsData={[
                  {
                    key: '-p --port <number>',
                    value:
                      'Port which the JSON-RPC server will be exposed. (default: "8545")',
                  },
                  {
                    key: '--compute-units-per-second [number]',
                    value:
                      'Sets the number of assumed available compute units per second for this fork provider.',
                  },
                  {
                    key: '--fork-url [url]',
                    value:
                      'Fetch state over a remote endpoint instead of starting from an empty state.',
                  },

                  {
                    key: '--fork-block-number [number]           ',
                    value:
                      'Fetch state from a specific block number over a remote endpoint.',
                  },
                  {
                    key: '--fork-chain-id [number]               ',
                    value:
                      'Specify chain id to skip fetching it from remote endpoint.',
                  },
                  {
                    key: '--fork-retry-backoff [number]          ',
                    value: 'Initial retry backoff on encountering errors.',
                  },
                  {
                    key: '--no-rate-limit                        ',
                    value: "Disables rate limiting for this node's provider.",
                  },
                  {
                    key: '--no-storage-caching                   ',
                    value:
                      'Explicitly disables the use of RPC caching. All storage slots are read entirely from the endpoint.',
                  },
                  {
                    key: '--retries [number]                     ',
                    value:
                      'Number of retry requests for spurious networks (timed out requests).',
                  },
                  {
                    key: '--timeout [number]                     ',
                    value:
                      'Timeout in ms for requests sent to remote JSON-RPC server in forking mode.',
                  },
                  {
                    key: '--block-base-fee-per-gas [number]      ',
                    value: 'The base fee in a block.',
                  },
                  {
                    key: '--code-size-limit [number]             ',
                    value:
                      'EIP-170: Contract code size limit in bytes. Useful to increase this because of tests.',
                  },
                  {
                    key: '--disable-block-gas-limit              ',
                    value:
                      'Disable the call.gas_limit <= block.gas_limit constraint.',
                  },
                  {
                    key: '--gas-limit [number]                   ',
                    value: 'The block gas limit.',
                  },
                  {
                    key: '--gas-price [number]                   ',
                    value: 'The gas price.',
                  },
                  {
                    key: '--accounts [number]                    ',
                    value: 'Number of dev accounts to generate and configure.',
                  },
                  {
                    key: '--balance [number]                     ',
                    value: 'The balance of every dev account in Ether.',
                  },
                  {
                    key: '--derivation-path [path]               ',
                    value:
                      'Sets the derivation path of the child key to be derived.',
                  },
                  {
                    key: '--mnemonic [phrase]                    ',
                    value:
                      'BIP39 mnemonic phrase used for generating accounts.',
                  },
                  {
                    key: '--steps-tracing                        ',
                    value:
                      'Enable steps tracing used for debug calls returning geth-style traces.',
                  },
                  {
                    key: '--timestamp [number]                   ',
                    value: 'The timestamp of the genesis block.',
                  },
                  {
                    key: '--allow-origin [string]                ',
                    value:
                      'Set the Access-Control-Allow-Origin response header (CORS).',
                  },
                  {
                    key: '--block-time [number]                  ',
                    value: 'Block time in seconds for interval mining.',
                  },
                  {
                    key: '--config-out [path]                    ',
                    value:
                      'Writes output of anvil as json to user-specified file.',
                  },
                  {
                    key: '--dump-state [path]                    ',
                    value: 'Dump the state of chain on exit to the given file.',
                  },
                  {
                    key: '--hardfork [type]                      ',
                    value: 'The EVM hardfork to use.',
                  },
                  {
                    key: '--host [string]                        ',
                    value: 'The host the server will listen on.',
                  },
                  {
                    key: '--init [path]                          ',
                    value:
                      'Initialize the genesis block with the given genesis.json file.',
                  },
                  {
                    key: '--ipc [path]                           ',
                    value:
                      'Launch an ipc server at the given path or default path = /tmp/anvil.ipc.',
                  },
                  {
                    key: '--load-state [path]                    ',
                    value:
                      'Initialize the chain from a previously saved state snapshot.',
                  },
                  {
                    key: '--no-cors                              ',
                    value: 'Disable CORS.',
                  },
                  {
                    key: '--no-mining                            ',
                    value:
                      'Disable auto and interval mining, and mine on demand instead.',
                  },
                  {
                    key: '--order [string]                       ',
                    value: 'How transactions are sorted in the mempool.',
                  },
                  {
                    key: '--prune-history [value]                ',
                    value:
                      "Don't keep full chain history. If a number argument is specified, at most this number of states is kept in memory.",
                  },
                  {
                    key: '--state-interval [number]              ',
                    value:
                      'Interval in seconds at which the status is to be dumped to disk.',
                  },
                  {
                    key: '--state [path]                         ',
                    value:
                      "Alias for both loadState and dumpState. Initializes the chain with the state stored at the file, if it exists, and dumps the chain's state on exit.",
                  },
                  {
                    key: '--transaction-block-keeper [number]    ',
                    value:
                      'Number of blocks with transactions to keep in memory.',
                  },
                  {
                    key: '-n --provider-url [url]                ',
                    value: 'RPC endpoint to fork off of',
                  },
                  {
                    key: '--build                                ',
                    value:
                      'Specify to rebuild generated artifacts with latest, even if no changed settings have been defined.',
                  },
                  {
                    key: '--upgrade-from [cannon-package:0.0.1]  ',
                    value:
                      'Specify a package to use as a new base for the deployment.',
                  },
                  {
                    key: '--registry-priority <registry>         ',
                    value:
                      'Change the default registry to read from first. Default: onchain',
                  },
                  {
                    key: '--preset <preset>                      ',
                    value: 'Load an alternate setting preset',
                  },
                  {
                    key: '--logs                                 ',
                    value: 'Show RPC logs instead of an interactive prompt',
                  },
                  {
                    key: '--fund-addresses <fundAddresses...>    ',
                    value:
                      'Pass a list of addresses to receive a balance of 10,000 ETH',
                  },
                  {
                    key: '--impersonate <address>                ',
                    value:
                      'Impersonate all calls from the given signer instead of a real wallet. Only works with --fork (default: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")',
                  },
                  {
                    key: '--mnemonic <phrase>                    ',
                    value:
                      'Use the specified mnemonic to initialize a chain of signers while running',
                  },

                  {
                    key: '--private-key [key]',
                    value:
                      'Specify a comma separated list of private keys which may be needed to sign a transaction',
                  },
                  {
                    key: '-h, --help',
                    value: 'display help for command',
                  },
                ]}
              />

              <DocumentationSection
                id="setup"
                command="setup [options]"
                description="Initialize cannon settings file."
              />

              <DocumentationSection
                id="build"
                command="build [options] [cannonfile] [settings...]"
                description="Build a package from a Cannonfile."
                argumentsData={[
                  {
                    key: 'cannonfile',
                    value: 'Path to a cannonfile (default: "cannonfile.toml")',
                  },
                  {
                    key: 'settings',
                    value: 'Custom settings for building the cannonfile',
                  },
                ]}
                optionsData={[
                  {
                    key: '-p --port <number>',
                    value:
                      'Port which the JSON-RPC server will be exposed. (default: "8545")',
                  },
                  {
                    key: '--compute-units-per-second [number]',
                    value:
                      'Sets the number of assumed available compute units per second for this fork provider.',
                  },
                  {
                    key: '--fork-url [url]',
                    value:
                      'Fetch state over a remote endpoint instead of starting from an empty state.',
                  },
                  {
                    key: '--fork-block-number [number]              ',
                    value:
                      'Fetch state from a specific block number over a remote endpoint.',
                  },
                  {
                    key: '--fork-chain-id [number]                  ',
                    value:
                      'Specify chain id to skip fetching it from remote endpoint.',
                  },
                  {
                    key: '--fork-retry-backoff [number]             ',
                    value: 'Initial retry backoff on encountering errors.',
                  },
                  {
                    key: '--no-rate-limit                           ',
                    value: "Disables rate limiting for this node's provider.",
                  },
                  {
                    key: '--no-storage-caching                      ',
                    value:
                      'Explicitly disables the use of RPC caching. All storage slots are read entirely from the endpoint.',
                  },
                  {
                    key: '--retries [number]                        ',
                    value:
                      'Number of retry requests for spurious networks (timed out requests).',
                  },
                  {
                    key: '--timeout [number]                        ',
                    value:
                      'Timeout in ms for requests sent to remote JSON-RPC server in forking mode.',
                  },
                  {
                    key: '--block-base-fee-per-gas [number]         ',
                    value: 'The base fee in a block.',
                  },
                  {
                    key: '--code-size-limit [number]                ',
                    value:
                      'EIP-170: Contract code size limit in bytes. Useful to increase this because of tests.',
                  },
                  {
                    key: '--disable-block-gas-limit                 ',
                    value:
                      'Disable the call.gas_limit <= block.gas_limit constraint.',
                  },
                  {
                    key: '--gas-limit [number]                      ',
                    value: 'The block gas limit.',
                  },
                  {
                    key: '--gas-price [number]                      ',
                    value: 'The gas price.',
                  },
                  {
                    key: '--accounts [number]                       ',
                    value: 'Number of dev accounts to generate and configure.',
                  },
                  {
                    key: '--balance [number]                        ',
                    value: 'The balance of every dev account in Ether.',
                  },
                  {
                    key: '--derivation-path [path]                  ',
                    value:
                      'Sets the derivation path of the child key to be derived.',
                  },
                  {
                    key: '--mnemonic [phrase]                       ',
                    value:
                      'BIP39 mnemonic phrase used for generating accounts.',
                  },
                  {
                    key: '--steps-tracing                           ',
                    value:
                      'Enable steps tracing used for debug calls returning geth-style traces.',
                  },
                  {
                    key: '--timestamp [number]                      ',
                    value: 'The timestamp of the genesis block.',
                  },
                  {
                    key: '--allow-origin [string]                   ',
                    value:
                      'Set the Access-Control-Allow-Origin response header (CORS).',
                  },
                  {
                    key: '--block-time [number]                     ',
                    value: 'Block time in seconds for interval mining.',
                  },
                  {
                    key: '--config-out [path]                       ',
                    value:
                      'Writes output of anvil as json to user-specified file.',
                  },
                  {
                    key: '--dump-state [path]                       ',
                    value: 'Dump the state of chain on exit to the given file.',
                  },
                  {
                    key: '--hardfork [type]                         ',
                    value: 'The EVM hardfork to use.',
                  },
                  {
                    key: '--host [string]                           ',
                    value: 'The host the server will listen on.',
                  },
                  {
                    key: '--init [path]                             ',
                    value:
                      'Initialize the genesis block with the given genesis.json file.',
                  },
                  {
                    key: '--ipc [path]                              ',
                    value:
                      'Launch an ipc server at the given path or default path = /tmp/anvil.ipc.',
                  },
                  {
                    key: '--load-state [path]                       ',
                    value:
                      'Initialize the chain from a previously saved state snapshot.',
                  },
                  {
                    key: '--no-cors                                 ',
                    value: 'Disable CORS.',
                  },
                  {
                    key: '--no-mining                               ',
                    value:
                      'Disable auto and interval mining, and mine on demand instead.',
                  },
                  {
                    key: '--order [string]                          ',
                    value: 'How transactions are sorted in the mempool.',
                  },
                  {
                    key: '--prune-history [value]                   ',
                    value:
                      "Don't keep full chain history. If a number argument is specified, at most this number of states is kept in memory.",
                  },
                  {
                    key: '--state-interval [number]                 ',
                    value:
                      'Interval in seconds at which the status is to be dumped to disk.',
                  },
                  {
                    key: '--state [path]                            ',
                    value:
                      "Alias for both loadState and dumpState. Initializes the chain with the state stored at the file, if it exists, and dumps the chain's state on exit.",
                  },
                  {
                    key: '--transaction-block-keeper [number]       ',
                    value:
                      'Number of blocks with transactions to keep in memory.',
                  },
                  {
                    key: '-n --provider-url [url]                   ',
                    value: 'RPC endpoint to execute the deployment on',
                  },
                  {
                    key: '-c --chain-id <number>                    ',
                    value: 'The chain id to run against',
                  },
                  {
                    key: '-p --preset <preset>                      ',
                    value:
                      'The preset label for storing the build with the given settings',
                  },
                  {
                    key: '--dry-run                                 ',
                    value:
                      'Simulate building on a local fork rather than deploying on the real network',
                  },
                  {
                    key: '--private-key [key]                       ',
                    value:
                      'Specify a comma separated list of private keys which may be needed to sign a transaction',
                  },
                  {
                    key: '--wipe                                    ',
                    value:
                      'Clear the existing deployment state and start this deploy from scratch.',
                  },
                  {
                    key: '--upgrade-from [cannon-package:0.0.1]     ',
                    value:
                      'Specify a package to use as a new base for the deployment.',
                  },
                  {
                    key: '--registry-priority <registry>            ',
                    value:
                      'Change the default registry to read from first. Default: onchain',
                  },
                  {
                    key: '--gas-price <gasPrice>                    ',
                    value: 'Specify a gas price to use for the deployment',
                  },
                  {
                    key: '--max-gas-fee <maxGasFee>                 ',
                    value: 'Specify max fee per gas (EIP-1559) for deployment',
                  },
                  {
                    key: '--max-priority-gas-fee <maxpriorityGasFee>',
                    value: 'Specify max fee per gas (EIP-1559) for deployment',
                  },
                  {
                    key: '--skip-compile',
                    value:
                      'Skip the compilation step and use the existing artifacts',
                  },
                  {
                    key: '-q --quiet',
                    value: 'Suppress extra logging',
                  },
                  {
                    key: '-v',
                    value:
                      'print logs for builder, equivalent to DEBUG=cannon:builder',
                  },
                  {
                    key: '-vv',
                    value:
                      'print logs for builder and its definition section, equivalent to DEBUG=cannon:builder,cannon:builder:definition',
                  },
                  {
                    key: '-vvv',
                    value:
                      'print logs for builder and its all sub sections, equivalent to DEBUG=cannon:builder*',
                  },
                  {
                    key: '-vvvv',
                    value:
                      'print all cannon logs, equivalent to DEBUG=cannon:*',
                  },
                ]}
              />

              <DocumentationSection
                id="verify"
                command="verify [options] <packageName>"
                description="Verify a package on Etherscan"
                argumentsData={[
                  {
                    key: 'packageName',
                    value: 'Name and version of the Cannon package to verify',
                  },
                ]}
                optionsData={[
                  { key: '-a --api-key <apiKey>', value: 'Etherscan API key' },
                  {
                    key: '-c --chain-id <chainId>',
                    value: 'Chain ID of deployment to verify (default: "1")',
                  },
                  {
                    key: '-p --preset <preset>',
                    value: 'Preset of the deployment to verify',
                  },
                ]}
              />

              <DocumentationSection
                id="publish"
                command="publish [options] <packageName>"
                description="Publish a Cannon package to the registry."
                argumentsData={[
                  {
                    key: 'packageName',
                    value: 'Name and version of the package to publish',
                  },
                ]}
                optionsData={[
                  {
                    key: '-n --registry-provider-url [url]',
                    value: 'RPC endpoint to publish to',
                  },
                  {
                    key: '--private-key <key>',
                    value:
                      'Private key to use for publishing the registry package',
                  },
                  {
                    key: '--chain-id <number>',
                    value: 'The chain ID of the package to publish',
                  },
                  {
                    key: '--preset <preset>',
                    value: 'The preset of the packages to publish',
                  },
                  {
                    key: '-t --tags <tags>',
                    value:
                      'Comma-separated list of labels for your package (default: "latest")',
                  },
                  {
                    key: '--gas-limit <gasLimit>',
                    value:
                      'The maximum units of gas spent for the registration transaction',
                  },
                  {
                    key: '--max-fee-per-gas <maxFeePerGas>',
                    value:
                      'The maximum value (in gwei) for the base fee when submitting the registry transaction',
                  },
                  {
                    key: '--max-priority-fee-per-gas <maxPriorityFeePerGas>',
                    value:
                      'The maximum value (in gwei) for the miner tip when submitting the registry transaction',
                  },
                  {
                    key: '-q --quiet',
                    value:
                      'Only output final JSON object at the end, no human-readable output',
                  },
                ]}
              />
            </Box>

            <Box mb={8}>
              <Heading fontSize="2xl" mb={5}>
                Advanced Commands
              </Heading>
              <DocumentationSection
                id="inspect"
                command="inspect [options] <packageName>"
                description="Inspect the details of a Cannon package."
                argumentsData={[
                  {
                    key: 'packageName',
                    value: 'Name and version of the cannon package to inspect',
                  },
                ]}
                optionsData={[
                  {
                    key: '-c --chain-id <chainId>',
                    value:
                      'Chain ID of the variant to inspect (default: "13370")',
                  },
                  {
                    key: '-p --preset <preset>',
                    value: 'Preset of the variant to inspect',
                  },
                  {
                    key: '-j --json',
                    value: 'Output as JSON',
                  },
                  {
                    key: '--write-deployments <writeDeployments>',
                    value:
                      'Path to write the deployments data (address and ABIs), like "./deployments"',
                  },
                  {
                    key: '-q --quiet',
                    value: 'Suppress extra logging',
                  },
                ]}
              />

              <DocumentationSection
                id="interact"
                command="interact [options] <packageName>"
                description="Start an interactive terminal against a set of active cannon deployments."
                argumentsData={[
                  {
                    key: 'packageName',
                    value: 'Package to deploy, optionally with custom settings',
                  },
                ]}
                optionsData={[
                  {
                    key: '-c --chain-id <chainId>',
                    value: 'Chain ID of deployment to interact with',
                  },
                  {
                    key: '-n --provider-url [url]',
                    value: 'RPC endpoint to execute the deployment on',
                  },
                  {
                    key: '-p --preset <preset>',
                    value: 'Load an alternate setting preset (default: "main")',
                  },
                  {
                    key: '--mnemonic <phrase>',
                    value:
                      'Use the specified mnemonic to initialize a chain of signers while running',
                  },
                  {
                    key: '--private-key [key]',
                    value:
                      'Specify a comma-separated list of private keys which may be needed to sign a transaction',
                  },
                  {
                    key: '--gas-price <gasPrice>',
                    value: 'Specify a gas price to use for the deployment',
                  },
                  {
                    key: '--max-gas-fee <maxGasFee>',
                    value: 'Specify max fee per gas (EIP-1559) for deployment',
                  },
                  {
                    key: '--max-priority-gas-fee <maxpriorityGasFee>',
                    value: 'Specify max fee per gas (EIP-1559) for deployment',
                  },
                ]}
              />

              <DocumentationSection
                id="trace"
                command="trace [options] <packageName> <transactionHash OR bytes32Data>"
                description="Get a full stack trace for a transaction hash or explicit transaction call."
                argumentsData={[
                  {
                    key: 'packageName',
                    value: 'Name and version of the cannon package to use',
                  },
                  {
                    key: 'transactionHash OR bytes32Data',
                    value:
                      'base 16 encoded transaction data to input to a function call, or transaction hash',
                  },
                ]}
                optionsData={[
                  {
                    key: '-c --chain-id <chainId>',
                    value:
                      'Chain ID of the variant to inspect (default: "13370")',
                  },
                  {
                    key: '-f --from <source>',
                    value: 'Caller for the transaction to trace',
                  },
                  {
                    key: '-t --to <target>',
                    value: 'Contract which should be called',
                  },
                  {
                    key: '-v --value <value>',
                    value: 'Amount of gas token to send in the traced call',
                  },
                  {
                    key: '-b --block-number <value>',
                    value: 'The block to simulate when the call is on',
                  },
                  {
                    key: '-p --preset <preset>',
                    value: 'Preset of the variant to inspect (default: "main")',
                  },
                  {
                    key: '-n --provider-url [url]',
                    value: 'RPC endpoint to fork off of',
                  },
                  {
                    key: '-j --json',
                    value: 'Output as JSON',
                  },
                ]}
              />

              <DocumentationSection
                id="decode"
                command="decode [options] <packageName> <bytes32Data...>"
                description="Decode transaction data using the ABIs of the given Cannon package."
                argumentsData={[
                  {
                    key: 'packageName',
                    value: 'Name and version of the cannon package to use',
                  },
                  {
                    key: 'bytes32Data',
                    value: 'bytes32 encoded transaction data to decode',
                  },
                ]}
                optionsData={[
                  {
                    key: '-c --chain-id <chainId>',
                    value:
                      'Chain ID of the variant to inspect (default: "13370")',
                  },
                  {
                    key: '-p --preset <preset>',
                    value: 'Preset of the variant to inspect (default: "main")',
                  },
                  {
                    key: '-j --json',
                    value: 'Output as JSON',
                  },
                ]}
              />

              <DocumentationSection
                id="test"
                command="test [cannonfile] [-- forge options...]"
                description="Run forge tests on a cannon deployment. To pass arguments through to 'forge test', use '--'."
                argumentsData={[
                  {
                    key: 'cannonfile',
                    value: 'Path to a cannonfile (default: "cannonfile.toml")',
                  },
                  {
                    key: 'forge options',
                    value: 'Additional options to send to forge',
                  },
                ]}
                optionsData={[
                  {
                    key: '-n --provider-url [url]',
                    value: 'RPC endpoint to fork off of',
                  },
                  {
                    key: '-c --chain-id',
                    value: 'Chain ID to connect to and run fork tests with',
                  },
                  {
                    key: '-p --preset <preset>',
                    value:
                      'The preset label for storing the build with the given settings (default: "main")',
                  },
                  {
                    key: '--wipe',
                    value:
                      'Clear the existing deployment state and start this deploy from scratch.',
                  },
                  {
                    key: '--upgrade-from [cannon-package:0.0.1]',
                    value:
                      'Specify a package to use as a new base for the deployment.',
                  },
                  {
                    key: '--registry-priority <registry>',
                    value:
                      'Change the default registry to read from first. Default: onchain',
                  },
                ]}
              />

              <DocumentationSection
                id="clean"
                command="clean [options]"
                description="Delete packages cache directories"
                optionsData={[
                  {
                    key: '--no-confirm',
                    value: 'Do not ask for confirmation before deleting',
                  },
                ]}
              />

              <DocumentationSection
                id="prune"
                command="prune [options]"
                description="Clean cannon storage of excessive/transient build files older than a certain age"
                optionsData={[
                  {
                    key: '--filter-package <packageName>',
                    value:
                      'Only keep deployments in local storage which match the given package name. Default: do not filter',
                  },
                  {
                    key: '--filter-variant <variant>',
                    value:
                      'Only keep deployments which match the specified variant(s). Default: do not filter',
                  },
                  {
                    key: '--keep-age <seconds>',
                    value:
                      'Number of seconds old a package must be before it should be deleted (default: "2592000")',
                  },
                  {
                    key: '--dry-run',
                    value:
                      'Print out information about prune without committing',
                  },
                  {
                    key: '-y --yes',
                    value: 'Skip confirmation prompt',
                  },
                ]}
              />

              <DocumentationSection
                id="alter"
                command="alter [options] <packageName> <command> [options...]"
                description="Change a cannon package outside of the regular build process."
                argumentsData={[
                  {
                    key: 'packageName',
                    value: 'Name and version of the Cannon package to alter',
                  },
                  {
                    key: 'command',
                    value:
                      'Alteration command to execute. Current options: set-url, set-contract-address, mark-complete, mark-incomplete',
                  },
                  {
                    key: 'options',
                    value: 'Additional options for your alteration command',
                  },
                ]}
                optionsData={[
                  {
                    key: '-c --chain-id <chainId>',
                    value: 'Chain ID of deployment to alter',
                  },
                  {
                    key: '-p --preset <preset>',
                    value: 'Preset of the deployment to alter',
                  },
                ]}
              />

              <DocumentationSection
                id="plugin-list"
                command="plugin list"
                description="List all installed Cannon plug-ins"
              />

              <DocumentationSection
                id="plugin-add"
                command="plugin add <name>"
                description="Add a Cannon plug-in"
                argumentsData={[
                  {
                    key: 'name',
                    value: 'npm package name of the Cannon plug-in',
                  },
                ]}
              />

              <DocumentationSection
                id="plugin-remove"
                command="plugin remove <name>"
                description="Remove a Cannon plug-in"
                argumentsData={[
                  {
                    key: 'name',
                    value: 'npm package name of the Cannon plug-in',
                  },
                ]}
              />
            </Box>
          </Container>
        </Box>
      </Flex>
    </Flex>
  );
};
