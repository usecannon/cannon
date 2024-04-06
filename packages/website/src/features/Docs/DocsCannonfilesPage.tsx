'use client';

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
  Code,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Badge,
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

export const DocsCannonfilesPage: FC = () => {
  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  const cannonfileSpecs = useCannonfileSpecs();

  if (!cannonfileSpecs) {
    return <CustomSpinner m="auto" />;
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
              title="Cannonfile Specification"
              links={[
                { href: '#cannonfile-metadata', text: 'Cannonfile Metadata' },
                { href: '#constants', text: 'Constants' },
                ...Array.from(cannonfileSpecs, ([key]) => key)
                  .filter(
                    (key) =>
                      key !== 'metadata' &&
                      !cannonfileSpecs.get(key)?.deprecated
                  )
                  .map((key) => ({
                    href: `#${key}`,
                    text: key as string,
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
                Cannonfiles include operations that specify the desired state of
                a blockchain. They are typically{' '}
                <Link isExternal href="https://toml.io/en/">
                  TOML files
                </Link>
                .
              </Text>
              <Text mb={4}>
                Each operation has a type and a name. Each type accepts a
                specific set of inputs (documented below) and modifies a return
                object. The return object is accessible in operations executed
                at later operations. The resulting return object is provided to
                any cannonfile that imports it with the <Code>pull</Code> or{' '}
                <Code>clone</Code> operations.
              </Text>
              <Text mb={4}>
                Cannonfiles are used to <strong>build</strong> chains into the
                desired state. This results in a package, which can be published
                to the registry. Packages contain three files:{' '}
                <Link href="#deployment-data">deployment data</Link>,{' '}
                <Link href="#package-code">package code</Link>, and{' '}
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
                        {key}
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
                <Text color="gray.400">Coming soon.</Text>
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
