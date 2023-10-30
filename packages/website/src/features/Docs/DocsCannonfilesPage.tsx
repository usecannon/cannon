'use client';

import {
  Flex,
  Box,
  useBreakpointValue,
  Container,
  Heading,
  Link,
  Text,
  Code,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import React, { FC } from 'react';

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
  data: { key: string; dataType: string; value: string }[];
}> = ({ data }) => (
  <Box overflowX="auto" mb={4}>
    <Table variant="simple" size="sm">
      <Thead>
        <Tr>
          <Th color="gray.300" pl={0} borderColor="gray.500">
            Name
          </Th>
          <Th color="gray.300" borderColor="gray.500">
            Type
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
            <Td borderColor="gray.500">
              <Text color="gray.300" fontSize="xs" fontWeight="medium">
                {row.dataType}
              </Text>
            </Td>
            <Td borderColor="gray.500">{row.value}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  </Box>
);

export const DocsCannonfilesPage: FC = () => {
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
            <Section
              title="Cannonfile Specification"
              links={[
                { href: '#cannonfile-metadata', text: 'Cannonfile Metadata' },
                { href: '#constants', text: 'Constants' },
                { href: '#setting', text: 'setting' },
                { href: '#contract', text: 'contract' },
                { href: '#invoke', text: 'invoke' },
                { href: '#import', text: 'import' },
                { href: '#provision', text: 'provision' },
                { href: '#router', text: 'router' },
                { href: '#run', text: 'run' },
              ]}
            />
            <Section
              title="Package Specification"
              links={[
                { href: '#deployment-data', text: 'Deployment Data' },
                { href: '#miscellaneous-data', text: 'Miscellaneous Data' },
                { href: '#metadata', text: 'Metadata' },
              ]}
            />
            <Section
              title="Recipes"
              links={[
                {
                  href: '#proxy-router-architecture',
                  text: 'Proxy Router Architecture',
                },
              ]}
            />
            <Section
              title="Advanced Usage"
              links={[
                {
                  href: '#factory-deployed-contracts',
                  text: 'Factory-deployed Contracts',
                },
                { href: '#extras', text: '’Extra’ Event Data' },
                { href: '#event-error-logging', text: 'Event Error Logging' },
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
                Cannonfile Documentation
              </Heading>
              <Text mb={4}>
                Cannonfiles include actions that specify the desired state of a
                blockchain. They are typically{' '}
                <Link isExternal href="https://toml.io/en/">
                  TOML files
                </Link>
                .
              </Text>
              <Text mb={4}>
                Each action has a type and a name. Each type accepts a specific
                set of inputs (documented below) and modifies a return object.
                The return object is accessible in steps executed at later
                steps. The resulting return object is provided to any cannonfile
                that imports it with the <Code>import</Code> or{' '}
                <Code>provision</Code> actions.
              </Text>
              <Text mb={4}>
                Cannonfiles are used to <strong>build</strong> chains into the
                desired state. This results in a package, which can be published
                to the registry. Packages contain three files:{' '}
                <Link href="#deployment-data">deployment data</Link>,{' '}
                <Link href="#miscellaneous-data">miscellaneous data</Link>, and{' '}
                <Link href="#metadata">metadata</Link>.
              </Text>
            </Box>

            <Box mb={8}>
              <Heading fontSize="2xl" mb={5}>
                Cannonfile Specification
              </Heading>
              <Box mb={16} id="cannonfile-metadata">
                <Heading mb={4} fontSize="lg">
                  Metadata
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#cannonfile-metadata'}
                  >
                    #
                  </Link>
                </Heading>
                <Text mb="4">Provide metadata for your Cannonfile.</Text>
                <CustomTable
                  data={[
                    {
                      key: 'name',
                      dataType: 'string',
                      value: 'Name of the package',
                    },
                    {
                      key: 'version',
                      dataType: 'string',
                      value: 'version of the package',
                    },
                    {
                      key: 'description?',
                      dataType: 'string',
                      value: 'Description for the package',
                    },
                    {
                      key: 'keywords?',
                      dataType: '[string]',
                      value: 'keywords for search indexing',
                    },
                  ]}
                />
              </Box>
              <Box mb={16} id="constants">
                <Heading mb={4} fontSize="lg">
                  Constants
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#constants'}
                  >
                    #
                  </Link>
                </Heading>
                <Text mb="4">
                  The following constants can be referenced in a Cannonfile
                </Text>
                <CustomTable
                  data={[
                    {
                      key: 'Zero',
                      dataType: 'number',
                      value: 'The BigNumber value representing "0".',
                    },
                    {
                      key: 'One',
                      dataType: 'number',
                      value: 'The BigNumber value representing "1".',
                    },
                    {
                      key: 'Two',
                      dataType: 'number',
                      value: 'The BigNumber value representing "2".',
                    },
                    {
                      key: 'WeiPerEther',
                      dataType: 'number',
                      value:
                        'The BigNumber value representing "1000000000000000000", which is the number of Wei per Ether.',
                    },
                    {
                      key: 'MaxUint256',
                      dataType: 'number',
                      value:
                        'The BigNumber value representing the maximum uint256 value.',
                    },
                    {
                      key: 'MinInt256',
                      dataType: 'number',
                      value:
                        'The BigNumber value representing the minimum int256 value.',
                    },
                    {
                      key: 'MaxInt256',
                      dataType: 'number',
                      value:
                        'The BigNumber value representing the maximum int256 value.',
                    },
                  ]}
                />
              </Box>
              <Box mb={16} id="setting">
                <Heading mb={4} fontSize="lg">
                  <Code px={0} fontSize="lg">
                    setting
                  </Code>
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#setting'}
                  >
                    #
                  </Link>
                </Heading>
                <Text mb="4">
                  A setting is a variable that can be set (or overriden using
                  the CLI) when building a Cannonfile. It is accessible
                  elsewhere in the file a property of the <Code>settings</Code>{' '}
                  object. For example, <Code>[setting.sampleSetting]</Code> can
                  be referenced with{' '}
                  <Code>&lt;%= settings.sampleSetting %&gt;</Code>
                </Text>
                <CustomTable
                  data={[
                    {
                      key: 'defaultValue?',
                      dataType: 'string',
                      value: '',
                    },
                    {
                      key: 'type?',
                      dataType: '"string" | "number" | "boolean" | undefined',
                      value: '',
                    },
                    {
                      key: 'description?',
                      dataType: 'string',
                      value: '',
                    },
                  ]}
                />
              </Box>

              <Box mb={16} id="contract">
                <Heading mb={4} fontSize="lg">
                  <Code px={0} fontSize="lg">
                    contract
                  </Code>
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#contract'}
                  >
                    #
                  </Link>
                </Heading>
                <Text mb="4">Deploy a contract.</Text>
                <CustomTable
                  data={[
                    {
                      key: 'artifact',
                      dataType: 'string',
                      value: 'Artifact name or path of the target contract',
                    },
                    {
                      key: 'highlight?',
                      dataType: 'boolean',
                      value:
                        'Determines whether contract should get priority in displays',
                    },
                    {
                      key: 'create2?',
                      dataType: 'boolean',
                      value:
                        'Determines whether to deploy the contract using create2',
                    },
                    {
                      key: 'from?',
                      dataType: 'string',
                      value:
                        'Contract deployer address. Must match the ethereum address format',
                    },
                    {
                      key: 'nonce?',
                      dataType: 'string',
                      value: '-',
                    },
                    {
                      key: 'abi?',
                      dataType: 'string',
                      value: 'Abi of the contract being deployed',
                    },
                    {
                      key: 'abiOf?',
                      dataType: '[string]',
                      value:
                        'An array of contract artifacts that have already been deployed with Cannon. This is useful when deploying proxy contracts.',
                    },
                    {
                      key: 'args?',
                      dataType:
                        '(string | number | boolean | (string | number | boolean)[] | string | number | boolean | string | number | boolean[])[]',
                      value: 'Constructor or initializer args',
                    },
                    {
                      key: 'libraries?',
                      dataType: 'string',
                      value:
                        'An array of contract action names that deploy libraries this contract depends on.',
                    },
                    {
                      key: 'salt?',
                      dataType: 'string',
                      value:
                        'Used to force new copy of a contract (not actually used)',
                    },
                    {
                      key: 'value?',
                      dataType: 'string',
                      value: 'Native currency value to send in the transaction',
                    },
                    {
                      key: 'overrides?',
                      dataType: '{ gasLimit?: string; }',
                      value: 'Override transaction settings',
                    },
                    {
                      key: 'depends?',
                      dataType: '[string]',
                      value: 'List of steps that this action depends on',
                    },
                  ]}
                />
              </Box>

              <Box mb={16} id="invoke">
                <Heading mb={4} fontSize="lg">
                  <Code px={0} fontSize="lg">
                    invoke
                  </Code>
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#invoke'}
                  >
                    #
                  </Link>
                </Heading>
                <Text mb="4">Call a function.</Text>
                <CustomTable
                  data={[
                    {
                      key: 'target',
                      dataType: 'Object',
                      value:
                        'Names of the contract to call or contract action that deployed the contract to call',
                    },
                    {
                      key: 'func',
                      dataType: 'string',
                      value: 'Name of the function to call on the contract',
                    },
                    {
                      key: 'abi?',
                      dataType: 'string',
                      value:
                        'JSON file of the contract ABI Required if the target contains an address rather than a contract action name.',
                    },
                    {
                      key: 'args?',
                      dataType:
                        '(string | number | boolean | (string | number | boolean)[] | string | number | boolean | string | number | boolean[])[]',
                      value: 'Arguments to use when invoking this call.',
                    },
                    {
                      key: 'from?',
                      dataType: 'string',
                      value:
                        'The calling address to use when invoking this call.',
                    },
                    {
                      key: 'fromCall?',
                      dataType:
                        '{ func: string; args?: (string | number | boolean | (string | number | boolean)[] | string | number | boolean | string | number | boolean[])[] }',
                      value:
                        "Specify a function to use as the 'from' value in a function call. Example owner().",
                    },
                    {
                      key: 'fromCall.func',
                      dataType: 'string',
                      value:
                        'The name of a view function to call on this contract. The result will be used as the from input.',
                    },
                    {
                      key: 'fromCall.args?',
                      dataType:
                        '(string | number | boolean | (string | number | boolean)[] | string | number | boolean | string | number | boolean[])[]',
                      value:
                        'The arguments to pass into the function being called.',
                    },
                    {
                      key: 'value?',
                      dataType: 'string',
                      value:
                        'The amount of ether/wei to send in the transaction.',
                    },
                    {
                      key: 'overrides?',
                      dataType: '{ gasLimit: string }',
                      value: 'Override transaction settings',
                    },
                    {
                      key: 'overrides.gasLimit',
                      dataType: 'string',
                      value: 'Gas limit to send along with the transaction',
                    },
                    {
                      key: 'extra?',
                      dataType:
                        '{ event: string; arg: number; allowEmptyEvents?: boolean }',
                      value:
                        'Object defined to hold extra transaction result data. For now its limited to getting event data so it can be reused in other steps',
                    },
                    {
                      key: 'factory?',
                      dataType:
                        '{ event: string; arg: number; artifact?: string; abiOf?: [string]; constructorArgs?: (string | number | boolean | (string | number | boolean)[] | string | number | boolean | string | number | boolean[])[]; allowEmptyEvents?: boolean }',
                      value:
                        'Object defined to hold deployment transaction result data. For now its limited to getting deployment event data so it can be reused in other steps',
                    },
                    {
                      key: 'depends?',
                      dataType: '[string]',
                      value: 'Previous steps this step is dependent on',
                    },
                  ]}
                />
              </Box>

              <Box mb={16} id="import">
                <Heading mb={4} fontSize="lg">
                  <Code px={0} fontSize="lg">
                    import
                  </Code>
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#import'}
                  >
                    #
                  </Link>
                </Heading>
                <Text mb="4">
                  Import a package from the registry. This will make the output
                  of that deployment, such as contract addresses, available to
                  other actions in your Cannonfile. Imported packages must
                  include deployments with chain ID that matches the chain ID of
                  the network you are deploying to.
                </Text>
                <CustomTable
                  data={[
                    {
                      key: 'source',
                      dataType: 'string',
                      value:
                        'Source of the cannonfile package to import from. Can be a cannonfile step name or package name',
                    },
                    {
                      key: 'chainId?',
                      dataType: 'number',
                      value: 'ID of the chain to import the package from',
                    },
                    {
                      key: 'preset?',
                      dataType: 'string',
                      value: 'Preset label of the package being imported',
                    },
                    {
                      key: 'depends?',
                      dataType: '[string]',
                      value:
                        "Previous steps this step is dependent on. Example in toml: depends = ['contract.Storage', 'import.Contract']",
                    },
                  ]}
                />
              </Box>

              <Box mb={16} id="provision">
                <Heading mb={4} fontSize="lg">
                  <Code px={0} fontSize="lg">
                    provision
                  </Code>
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#provision'}
                  >
                    #
                  </Link>
                </Heading>
                <Text mb="4">
                  Deploy a new instance of a package from the registry. Packages
                  may only be provisioned if they include a local,{' '}
                  <em>Cannon</em> deployment (Chain ID: 13370).
                </Text>
                <CustomTable
                  data={[
                    {
                      key: 'source',
                      dataType: 'string',
                      value: 'Name of the package to provision',
                    },
                    {
                      key: 'chainId?',
                      dataType: 'number',
                      value:
                        'ID of the chain to import the package from. Default - 13370',
                    },
                    {
                      key: 'sourcePreset?',
                      dataType: 'string',
                      value:
                        'Override the preset to use when provisioning this package. Default - "main"',
                    },
                    {
                      key: 'targetPreset?',
                      dataType: 'string',
                      value:
                        'Set the new preset to use for this package. Default - "main"',
                    },
                    {
                      key: 'options?',
                      dataType: 'string',
                      value:
                        'The settings to be used when initializing this Cannonfile. Overrides any defaults preset in the source package.',
                    },
                    {
                      key: 'tags?',
                      dataType: '[string]',
                      value:
                        'Additional tags to set on the registry for when this provisioned package is published.',
                    },
                    {
                      key: 'depends?',
                      dataType: '[string]',
                      value: 'Previous steps this step is dependent on',
                    },
                  ]}
                />
              </Box>

              <Box mb={16} id="router">
                <Heading mb={4} fontSize="lg">
                  <Code px={0} fontSize="lg">
                    router
                  </Code>
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#router'}
                  >
                    #
                  </Link>
                </Heading>
                <Text mb="4">Explain what this is</Text>
                <CustomTable
                  data={[
                    {
                      key: 'contracts',
                      dataType: '[string]',
                      value:
                        'Set of contracts that will be passed to the router',
                    },
                    {
                      key: 'from?',
                      dataType: 'string',
                      value: 'Address to pass to the from call',
                    },
                    {
                      key: 'salt?',
                      dataType: 'string',
                      value:
                        'Used to force new copy of a contract (not actually used)',
                    },
                    {
                      key: 'depends?',
                      dataType: '[string]',
                      value: 'List of steps that this action depends on',
                    },
                  ]}
                />
              </Box>

              <Box mb={16} id="run">
                <Heading mb={4} fontSize="lg">
                  <Code px={0} fontSize="lg">
                    run
                  </Code>
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#run'}
                  >
                    #
                  </Link>
                </Heading>
                <Text mb="4">
                  Execute a custom script. This script is passed a
                  <Code>ChainBuilder</Code> object as parameter. This action
                  breaks composability—only use this as a last resort. Instead,
                  you should use a custom Cannon plug-in if this is necessary
                  for your deployment.
                </Text>
                <CustomTable
                  data={[
                    {
                      key: 'exec',
                      dataType: 'string',
                      value: 'The javascript (or typescript) file to load',
                    },
                    {
                      key: 'func',
                      dataType: 'string',
                      value: 'The function to call in this file',
                    },
                    {
                      key: 'modified',
                      dataType: '[string]',
                      value:
                        "An array of files and directories that this script depends on. The cache of the cannonfile's build is recreated when these files change.",
                    },
                    {
                      key: 'args?',
                      dataType: '[string]',
                      value:
                        'Arguments passed to the function (after the ChainBuilder object)',
                    },
                    {
                      key: 'env?',
                      dataType: '[string]',
                      value: 'Environment variables to be set on the script',
                    },
                    {
                      key: 'depends?',
                      dataType: '[string]',
                      value: 'List of steps that this action depends on',
                    },
                  ]}
                />
              </Box>
            </Box>
            <Box mb={8}>
              <Heading fontSize="2xl" mb={5}>
                Package Specification
              </Heading>

              <Box mb={16} id="deployment-data">
                <Heading mb={4} fontSize="lg">
                  Deployment Data
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#deployment-data'}
                  >
                    #
                  </Link>
                </Heading>
                <Text color="gray.400">Coming soon.</Text>
              </Box>

              <Box mb={16} id="miscellaneous-data">
                <Heading mb={4} fontSize="lg">
                  Miscellaneous Data
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#miscellaneous-data'}
                  >
                    #
                  </Link>
                </Heading>
                <Text color="gray.400">Coming soon.</Text>
              </Box>

              <Box mb={16} id="metadata">
                <Heading mb={4} fontSize="lg">
                  Metadata
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#metadata'}
                  >
                    #
                  </Link>
                </Heading>
                <Text color="gray.400">Coming soon.</Text>
              </Box>
            </Box>

            <Box mb={8}>
              <Heading fontSize="2xl" mb={5}>
                Recipes
              </Heading>

              <Box mb={16} id="proxy-router-architecture">
                <Heading mb={4} fontSize="lg">
                  Proxy Router Architecture
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#proxy-router-architecture'}
                  >
                    #
                  </Link>
                </Heading>
                <Text color="gray.400">Coming soon.</Text>
              </Box>
            </Box>

            <Box mb={8}>
              <Heading fontSize="2xl" mb={5}>
                Advanced Usage
              </Heading>

              <Box mb={16} id="factory-deployed-contracts">
                <Heading mb={4} fontSize="lg">
                  Factory-deployed Contracts
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#factory-deployed-contracts'}
                  >
                    #
                  </Link>
                </Heading>
                <Text mb="4">
                  Smart contracts may have functions which deploy other smart
                  contracts. Contracts which deploy others are typically
                  referred to as factory contracts. You can reference contracts
                  deployed by factories in your cannonfile.
                </Text>

                <Text mb="4">
                  For example, if the deployPool function below deploys a
                  contract, the following invoke command registers that contract
                  based on event data emitted from that call.
                </Text>

                <Box mb="4">
                  <Code display="block">[invoke.deployment]</Code>
                  <Code display="block">
                    target = [&quot;PoolFactory&quot;]
                  </Code>
                  <Code display="block">func = &quot;deployPool&quot;</Code>
                  <Code display="block">
                    factory.MyPoolDeployment.artifact = &quot;Pool&quot;
                  </Code>
                  <Code display="block">
                    # alternatively, if the code for the deployed contract is
                    not available in your artifacts, you can also reference the
                    ABI like:
                  </Code>
                  <Code display="block">
                    # factory.MyPoolDeployment.abiOf = &quot;PreviousPool&quot;
                  </Code>
                  <Code display="block">
                    factory.MyPoolDeployment.event = &quot;NewDeployment&quot;
                  </Code>
                  <Code display="block">factory.MyPoolDeployment.arg = 0</Code>
                </Box>

                <Text mb="4">
                  Specifically, this would anticipate this invoke call will emit
                  an event named NewDeployment with a contract address as the
                  first data argument (per arg, a zero-based index). This
                  contract should implement the Pool contract. Now, a subsequent
                  invoke step could set target = [&quot;MyPoolDeployment&quot;].
                </Text>

                <Text mb="4">
                  To reference contract information for a contract deployed on a
                  previous invoke step such as the example shown above call the
                  contracts object inside your cannonfile. For example &lt;%=
                  contracts.MyPoolDeployment.address %&gt; would return the
                  address of the Pool contract deployed by the PoolFactory
                  contract.
                </Text>

                <Text mb="4">
                  If the invoked function deploys multiple contracts of the same
                  name, you can specify them by index through the contracts
                  object. &lt;%= contracts.MyPoolDeployment.address %&gt; would
                  return the first deployed Pool contract address. &lt;%=
                  contracts.MyPoolDeployment_0.address %&gt; would return the
                  second deployed Pool contract address. These contracts are
                  added to the return object as they would be if deployed by a
                  contract step.
                </Text>
              </Box>

              <Box mb={16} id="extras">
                <Heading mb={4} fontSize="lg">
                  ’Extra’ Event Data
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#extras'}
                  >
                    #
                  </Link>
                </Heading>
                <Text mb="4">
                  If an invoked function emits an event, cannon can parse the
                  event data in your cannonfile by using the extras property,
                  This lets you reference previously emitted event’s data in
                  subsequent invoke steps.
                </Text>
                <Text mb={4}>
                  For example, to track the NewDeployment event data from the
                  PoolFactory deployment from the example above, add the extra
                  property and set an attribute for the event like so:
                </Text>

                <Box mb="4">
                  <Code display="block">[invoke.deployment]</Code>
                  <Code display="block">
                    target = [&quot;PoolFactory&quot;]
                  </Code>
                  <Code display="block"># ....</Code>
                  <Code display="block">
                    extra.NewDeploymentEvent.event = &quot;NewDeployment&quot;
                  </Code>
                  <Code display="block">extra.NewDeploymentEvent.arg = 0</Code>
                </Box>

                <Text mb={4}>
                  Now, calling &quot;&lt;% = extras.NewDeploymentEvent
                  %&gt;&quot; in a subsequent invoke step would return the first
                  data argument for NewDeployment.
                </Text>

                <Text mb={4}>
                  If an invoked function emits multiple events you can specify
                  them by index.
                </Text>

                <Text mb={4}>
                  For example if the PoolFactory emitted multiple NewDeployment
                  events: &lt;%= extras.NewDeploymentEvent_0 %&gt; would return
                  the first emitted event of this kind. &lt;%=
                  extras.NewDeploymentEvent_4 %&gt; would reference the fifth
                  emitted event of this kind.
                </Text>
              </Box>

              <Box mb={16} id="event-error-logging">
                <Heading mb={4} fontSize="lg">
                  Event Error Logging
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#event-error-logging'}
                  >
                    #
                  </Link>
                </Heading>
                <Text mb="4">
                  If an event is specified in the cannonfile but the invoke
                  function does not emit any events or emits an event that
                  doesn’t match the one specified in the cannonfile, the invoke
                  step will fail with an error.
                </Text>

                <Text mb="4">
                  You can bypass the event error logging by setting it like
                  <Code>
                    extras.NewDeploymentEvent.allowEmptyEvents = true
                  </Code>{' '}
                  or
                  <Code>
                    factory.MyPoolDeployment.allowEmptyEvents = true
                  </Code>{' '}
                  under the factory or extra property that throws an error.
                </Text>
                <Text mb="4">
                  An useful example would for this would be when an event is
                  only emitted under certain conditions but you still need to
                  reference it when it is emitted or don’t want to halt
                  execution when it’s not emitted.
                </Text>
                <Text mb="4">
                  Keep in mind you wont be able to reference event or contract
                  data through the contracts or extras properties if a matching
                  event wasnt emitted
                </Text>
              </Box>
            </Box>
          </Container>
        </Box>
      </Flex>
    </Flex>
  );
};
