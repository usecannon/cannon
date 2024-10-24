'use client';

import { CommandPreview } from '@/components/CommandPreview';
import { CustomSpinner } from '@/components/CustomSpinner';
import { useCannonfileSpecs } from '@/hooks/cannonfileSpecs';
import {
  Flex,
  Box,
  useBreakpointValue,
  Container,
  Heading,
  Link,
  Text,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Badge,
  Code,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import React, { FC } from 'react';
import { a11yDark, CodeBlock } from 'react-code-blocks';

const artifactDataExample = {
  artifacts: {
    MyContract: {
      _format: 'hh-sol-artifact-1',
      contractName: 'MyContract',
      sourceName: 'contracts/MyContract.sol',
      abi: ['...'],
      bytecode: '0x...',
      deployedBytecode: '0x...',
      linkReferences: {},
      deployedLinkReferences: {},
      source: {
        solcVersion: '0.8.24+commit.e11b9ed9',
        input:
          '{"language":"Solidity","sources":{"example/example/contracts/MyContract.sol":{"content":\\ Your Contract Source Code',
      },
    },
  },
};

const deploymentDataExample = {
  generator: 'cannon cli 2.15.0',
  timestamp: 1718767889,
  def: {
    name: 'my-package',
    version: '1.0.0',
    setting: {
      owner: {
        defaultValue: '0x...',
      },
    },
    contract: {
      MyContract: {
        artifact: 'MyContract',
        owner: '<%= settings.owner %>',
      },
    },
  },
  state: {
    'setting.owner': {
      artifacts: {
        settings: {
          owner: '0x...',
        },
      },
      hash: '...',
      version: 7,
    },
    'contract.MyContract': {
      artifacts: {
        contracts: {
          Implementation: {
            address: '0x...',
            abi: ['...'],
            constructorArgs: ['...'],
            linkedLibraries: {},
            deployTxnHash: '0x...',
            sourceName: 'contracts/MyContract.sol',
            contractName: 'MyContract',
            deployedOn: 'contract.MyContract',
            gasUsed: 2172726,
            gasCost: '4726073795',
          },
        },
      },
      hash: '...',
      version: 7,
    },
  },
  options: {},
  meta: {
    name: 'my-package',
    version: '1.0.0',
    private: true,
    description: 'My Custom Contract package',
    scripts: {
      test: 'hardhat compile && hardhat --network hardhat test',
      coverage: 'hardhat coverage',
    },
    repository: {
      type: 'git',
      url: 'git+https://github.com/example/example.git',
    },
    author: '',
    license: 'MIT',
    bugs: {
      url: 'https://github.com/example/example/issues',
    },
    homepage: 'https://github.com/example/example#readme',
    devDependencies: {
      ethers: '5.7.1',
      hardhat: '^2.22.3',
      'hardhat-cannon': '^2.14.3',
    },
  },
  miscUrl: 'ipfs://Qm...',
};

interface LinkItem {
  href: string;
  text: string;
  monospace?: boolean;
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
        <Link
          key={index}
          display="block"
          textDecoration="none"
          borderRadius="md"
          mb={0.5}
          py={0.5}
          px="2"
          cursor="pointer"
          fontSize="sm"
          fontFamily={link.monospace ? 'var(--font-mono)' : undefined}
          _hover={{ background: 'gray.800' }}
          href={link.href}
        >
          {link.text}
        </Link>
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
          <Th color="gray.300" borderColor="gray.500" maxWidth="180px">
            Type
          </Th>
          <Th color="gray.300" borderColor="gray.500" maxWidth="180px">
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
            <Td borderColor="gray.500" maxWidth="180px">
              <Text color="gray.300" fontSize="xs" fontWeight="medium">
                {row.dataType}
              </Text>
            </Td>
            <Td borderColor="gray.500" maxWidth="180px">
              {row.value}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  </Box>
);

const DocsCannonfilesPage: FC = () => {
  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  const { isLoading, data: cannonfileSpecs, error } = useCannonfileSpecs();

  if (isLoading) {
    return <CustomSpinner m="auto" />;
  }

  if (!cannonfileSpecs) {
    return <Text>Error: {error?.message}</Text>;
  }

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
              title="Cannonfile Spec"
              links={[
                { href: '#cannonfile-metadata', text: 'Metadata' },
                { href: '#constants', text: 'Constants' },
                { href: '#utilities', text: 'Utilities' },
                ...Array.from(cannonfileSpecs, ([key]) => key)
                  .filter(
                    (key) =>
                      key !== 'metadata' &&
                      !cannonfileSpecs.get(key)?.deprecated
                  )
                  .map((key) => ({
                    href: `#${key}`,
                    text: `[${key}.*]`,
                    monospace: true,
                  })),
              ]}
            />
            <Section
              title="Package Specification"
              links={[
                { href: '#deployment-data', text: 'Deployment Data' },
                { href: '#package-code', text: 'Package Code' },
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
                {
                  href: '#extras',
                  text: 'Save Emitted Event Data in a Variable',
                },
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
                Cannonfiles are like deployment plans. They include operations
                that specify the desired state of a blockchain. The web app and
                the CLI can be used to <Code>build</Code> the blockchain into
                this state. This results in a package of data pertaining to the
                deployment, which can be uploaded using IPFS and published to
                the registry on Ethereum. Deployments that upgrade from existing
                packages will recognize which operations have been completed,
                executing only those that have been added or changed.
              </Text>
              <Text mb={4}>
                Each operation has a type and a name, like{' '}
                <Code>[deploy.MyContract]</Code>. Each type accepts a specific
                set of inputs (documented below) and can modify{' '}
                <Code>settings</Code> and <Code>imports</Code> objects (which
                can be referenced in{' '}
                <Link
                  href="https://lodash.com/docs/4.17.15#template"
                  isExternal
                >
                  templates
                </Link>{' '}
                like
                <Code>name=&lt;%= settings.name %&gt;</Code>). The templates can
                also use{' '}
                <Link
                  href="https://github.com/wevm/viem/tree/main/src/utils"
                  isExternal
                >
                  utilities
                </Link>
                ,{' '}
                <Link
                  href="https://github.com/wevm/viem/blob/main/src/constants/number.ts"
                  isExternal
                >
                  number constants
                </Link>
                , and{' '}
                <Link
                  href="https://github.com/wevm/viem/blob/main/src/constants/address.ts"
                  isExternal
                >
                  some
                </Link>{' '}
                <Link
                  href="https://github.com/wevm/viem/blob/main/src/constants/bytes.ts"
                  isExternal
                >
                  others
                </Link>{' '}
                from{' '}
                <Link href="https://viem.sh/" isExternal>
                  viem
                </Link>
                . The objects are also passed into cannonfiles that reference
                them with the <Code>pull</Code> and <Code>clone</Code>{' '}
                operations.
              </Text>
              <Text mb={4}>
                Packages that result from <Code>build</Code>s consist of three
                JSON files, which are compressed and uploaded using IPFS:{' '}
                <Link href="#deployment-data">deployment data</Link>,{' '}
                <Link href="#package-code">code</Link>, and{' '}
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
                <Text mb="4">
                  {cannonfileSpecs.get('metadata')?.description}
                </Text>
                <CustomTable
                  data={
                    cannonfileSpecs.get('metadata')?.specs.map((spec) => ({
                      key: spec.name,
                      dataType: spec.type,
                      value: spec.description,
                    })) ?? []
                  }
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
                      key: 'AddressZero | zeroAddress',
                      dataType: 'string',
                      value:
                        'Zero Addres string: "0x0000000000000000000000000000000000000000".',
                    },
                    {
                      key: 'HashZero | zeroHash',
                      dataType: 'string',
                      value:
                        'Zero hash value: "0x0000000000000000000000000000000000000000000000000000000000000000"',
                    },
                    {
                      key: 'maxInt8...256',
                      dataType: 'number',
                      value:
                        'BigNumber values representing from maxInt8 to maxInt256.',
                    },
                    {
                      key: 'minInt8...256',
                      dataType: 'number',
                      value:
                        'BigNumber values representing from minInt8 to minInt256.',
                    },
                    {
                      key: 'maxUint8...256',
                      dataType: 'number',
                      value:
                        'BigNumber values representing from maxUint8 to maxUint256.',
                    },
                  ]}
                />
              </Box>
              <Box mb={16} id="utilities">
                <Heading mb={4} fontSize="lg">
                  Utilities
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
                  <Link
                    href="https://viem.sh/docs/utilities/getAddress"
                    isExternal
                  >
                    Viem.sh
                  </Link>{' '}
                  utility functions are available inside interpolation values,
                  e.g.:
                </Text>
                <CommandPreview
                  backgroundColor="black"
                  command={'args = ["<%=  keccak256(\'some string\') %>"]'}
                />
              </Box>
              {Array.from(cannonfileSpecs)
                .sort((a, b) => {
                  const aDeprecated = cannonfileSpecs?.get(a[0])?.deprecated
                    ? 1
                    : 0;
                  const bDeprecated = cannonfileSpecs?.get(b[0])?.deprecated
                    ? 1
                    : 0;
                  return aDeprecated - bDeprecated;
                })
                .filter(([key]) => key !== 'metadata')
                .map(([key, value]) => (
                  <Box key={key} id={key} mb={16}>
                    <Heading mb={4} fontSize="lg">
                      <Code px={0} fontSize="lg">
                        [{key}.*]
                      </Code>
                      <Link
                        color="gray.300"
                        ml={2}
                        textDecoration="none"
                        _hover={{ textDecoration: 'underline' }}
                        href={`#${key}`}
                      >
                        #
                      </Link>
                      {value.deprecated && (
                        <Badge
                          colorScheme="teal"
                          ml="3"
                          transform="translateY(-1.5px)"
                          pt={0.5}
                        >
                          Deprecated
                        </Badge>
                      )}
                    </Heading>
                    <Text mb="4">{value.description}</Text>
                    <CustomTable
                      data={value.specs.map((spec) => ({
                        key: spec.name,
                        dataType: spec.type,
                        value: spec.description,
                      }))}
                    />
                  </Box>
                ))}
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
                <Text color="gray.400">
                  Primary source of cannon package information which contains
                  package definition and on-chain state data derived changes
                  made by defined steps in the cannonfile definition. Deployment
                  data is stored on IPFS and is locally stored in your
                  filesystem in the default storage location
                  <Code>~/.local/share/cannon/tags</Code> or the storage
                  location defined by the CANNON_DIRECTORY environment variable.
                  <br />
                  <br />
                  Here is an example of a cannon deployment data:
                  <CodeBlock
                    text={JSON.stringify(deploymentDataExample, null, 2)}
                    language="bash"
                    showLineNumbers={false}
                    theme={a11yDark}
                    customStyle={{ fontSize: '14px', maxHeight: '10rem' }}
                  />
                </Text>
              </Box>

              <Box mb={16} id="package-code">
                <Heading mb={4} fontSize="lg">
                  Package Code
                  <Link
                    color="gray.300"
                    ml={2}
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    href={'#package-code'}
                  >
                    #
                  </Link>
                </Heading>
                <Text color="gray.400">
                  Contains artifact data and other contract source code data
                  about the contracts deployed during the build.
                  <br />
                  <br />
                  Here is an example of a deployments package data:
                  <CodeBlock
                    text={JSON.stringify(artifactDataExample, null, 2)}
                    language="bash"
                    showLineNumbers={false}
                    theme={a11yDark}
                    customStyle={{ fontSize: '14px', maxHeight: '10rem' }}
                  />
                </Text>
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
                <Text color="gray.400">
                  Metadata contains external information related to the cannon
                  package. Currently metadata includes the following:
                  <UnorderedList>
                    <ListItem> Git Repo URL</ListItem>
                    <ListItem>
                      Commit hash of the changes in which the last instance of
                      the package were made
                    </ListItem>
                    <ListItem>
                      Link to the package git repo README file
                    </ListItem>
                  </UnorderedList>
                  Metadata is also stored on IPFS and is locally stored in your
                  filesystem in the default storage location
                  <Code>~/.local/share/cannon/tags</Code> or the storage
                  location defined by the CANNON_DIRECTORY environment variable.
                </Text>
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
                  invoke operation could set target =
                  [&quot;MyPoolDeployment&quot;].
                </Text>

                <Text mb="4">
                  To reference contract information for a contract deployed on a
                  previous invoke operation such as the example shown above call
                  the contracts object inside your cannonfile. For example
                  &lt;%= contracts.MyPoolDeployment.address %&gt; would return
                  the address of the Pool contract deployed by the PoolFactory
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
                  contract operation.
                </Text>
              </Box>

              <Box mb={16} id="var">
                <Heading mb={4} fontSize="lg">
                  Save Emitted Event Data in a Variable
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
                  event data in your cannonfile by using the var property, This
                  lets you reference previously emitted event’s data in
                  subsequent invoke operations.
                </Text>
                <Text mb={4}>
                  For example, to track the NewDeployment event data from the
                  PoolFactory deployment from the example above, add the var
                  property and set an attribute for the event like so:
                </Text>

                <Box mb="4">
                  <Code display="block">[invoke.deployment]</Code>
                  <Code display="block">
                    target = [&quot;PoolFactory&quot;]
                  </Code>
                  <Code display="block"># ....</Code>
                  <Code display="block">
                    var.NewDeploymentEvent.event = &quot;NewDeployment&quot;
                  </Code>
                  <Code display="block">var.NewDeploymentEvent.arg = 0</Code>
                </Box>

                <Text mb={4}>
                  Now, calling &quot;&lt;% = settings.NewDeploymentEvent
                  %&gt;&quot; in a subsequent invoke operation would return the
                  first data argument for NewDeployment.
                </Text>

                <Text mb={4}>
                  If an invoked function emits multiple events you can specify
                  them by index.
                </Text>

                <Text mb={4}>
                  For example if the PoolFactory emitted multiple NewDeployment
                  events: &lt;%= settings.NewDeploymentEvent_0 %&gt; would
                  return the first emitted event of this kind. &lt;%=
                  settings.NewDeploymentEvent_4 %&gt; would reference the fifth
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
                  operation will fail with an error.
                </Text>

                <Text mb="4">
                  You can bypass the event error logging by setting it like
                  <Code>var.NewDeploymentEvent.allowEmptyEvents = true</Code> or
                  <Code>
                    factory.MyPoolDeployment.allowEmptyEvents = true
                  </Code>{' '}
                  under the factory or var property that throws an error.
                </Text>
                <Text mb="4">
                  An useful example would for this would be when an event is
                  only emitted under certain conditions but you still need to
                  reference it when it is emitted or don’t want to halt
                  execution when it’s not emitted.
                </Text>
                <Text mb="4">
                  Keep in mind you wont be able to reference event or contract
                  data through the contracts or settings properties if a
                  matching event wasnt emitted
                </Text>
              </Box>
            </Box>
          </Container>
        </Box>
      </Flex>
    </Flex>
  );
};

export default DocsCannonfilesPage;
