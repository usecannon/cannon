'use client';
import { links } from '@/constants/links';
import {
  Flex,
  Box,
  useTheme,
  Heading,
  Link,
  Text,
  Button,
  SimpleGrid,
  Icon,
} from '@chakra-ui/react';
import React from 'react';
import NextLink from 'next/link';

export const DocsLandingPage = () => {
  const theme = useTheme();
  return (
    <Flex
      background={theme.gradients.dark}
      backgroundAttachment="fixed"
      flex="1"
      py={[4, 4, 8]}
      p={4}
    >
      <Box
        overflowX="hidden"
        p={8}
        maxW="container.md"
        m="auto"
        background="black"
        border="1px solid"
        borderColor="gray.800"
        borderRadius="md"
      >
        <Heading
          as="h2"
          size="lg"
          fontWeight={600}
          pb={4}
          mb={4}
          borderBottom="1px solid"
          borderBottomColor="gray.800"
          letterSpacing="0.2px"
        >
          Quick Overview
        </Heading>
        <Text mb={4}>
          <strong>Cannon</strong> is a DevOps tool for protocols on Ethereum. It
          manages protocol and smart contract deployments for local development
          and live networks.
        </Text>
        <Text mb={4}>
          Drawing inspiration from <em>Infrastructure as Code</em> tools like
          Terraform and CloudFormation, Cannon replaces deploy scripts with{' '}
          <Link href={links.CANNONFILE} as={NextLink}>
            Cannonfiles
          </Link>
          .
        </Text>
        <Text mb={4}>
          Cannonfiles describe the desired state of a blockchain (rather than a
          list of transactions to execute). For example, you may want a chain to
          have particular protocols deployed with certain functions called on
          them.
        </Text>
        <Text mb={4}>
          Then you can <strong>build</strong> the chain into this state using
          the{' '}
          <Link href={links.CLI} as={NextLink}>
            command-line interface
          </Link>{' '}
          or the{' '}
          <Link href={links.DEPLOY} as={NextLink}>
            deployer
          </Link>
          . This generates a package with information related to the deployment.
          Packages can be published to the{' '}
          <Link href={links.EXPLORE} as={NextLink}>
            registry
          </Link>
          .
        </Text>
        <Text mb={4}>
          Packages enable composability in Cannonfiles. If a package includes a
          ”Cannon” deployment, it can be <em>provisioned</em> to{' '}
          <Link
            isExternal
            href="https://github.com/Synthetixio/synthetix-sandbox/blob/main/cannonfile.toml#L27"
          >
            create a new instance of the protocol or smart contract
          </Link>
          . Packages with live network deployments can be <em>imported</em>,
          allowing protocols to connect with{' '}
          <Link
            isExternal
            href="https://github.com/Synthetixio/synthetix-sandbox/blob/main/cannonfile.prod.toml#L5"
          >
            existing deployments
          </Link>
          .
        </Text>
        <Text mb={3}>
          Cannon is useful across the entire protocol development lifecycle:
        </Text>

        <SimpleGrid columns={{ base: 1, sm: 1, md: 2 }} gap={4} mb={8}>
          <Box
            p={3}
            borderRadius="md"
            border="1px solid"
            borderColor="gray.700"
          >
            <Heading size="xs" mb={1}>
              <Icon
                viewBox="0 0 24 24"
                boxSize={4}
                mr={1.5}
                fill="none"
                stroke="currentColor"
                transform="translateY(-1.5px)"
              >
                <line x1="6" y1="3" x2="6" y2="15"></line>
                <circle cx="18" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <path d="M18 9a9 9 0 0 1-9 9"></path>
              </Icon>
              Protocol Development
            </Heading>
            <Text fontSize="xs">
              Developers can specify a chain state like ordering a sandwich. The
              ingredients of a{' '}
              <Link href={links.CANNONFILE} as={NextLink}>
                cannonfile
              </Link>{' '}
              may include existing protocols, dynamic function calls, and the
              smart contracts under development.
            </Text>
          </Box>
          <Box
            p={3}
            borderRadius="md"
            border="1px solid"
            borderColor="gray.700"
          >
            <Heading size="xs" mb={1}>
              <Icon
                viewBox="0 0 24 24"
                boxSize={4}
                mr={1.5}
                fill="none"
                stroke="currentColor"
                transform="translateY(-1.5px)"
              >
                <polyline points="4 17 10 11 4 5"></polyline>
                <line x1="12" y1="19" x2="20" y2="19"></line>
              </Icon>
              Client Development
            </Heading>
            <Text fontSize="xs">
              The{' '}
              <Link href={links.CLI} as={NextLink}>
                CLI
              </Link>{' '}
              runs cannonfiles locally. Protocol engineers can publish
              development versions of their protocols, allowing for parallel,
              iterative development of off-chain integrations like user
              interfaces and bots.
            </Text>
          </Box>

          <Box
            p={3}
            borderRadius="md"
            border="1px solid"
            borderColor="gray.700"
          >
            <Heading size="xs" mb={1}>
              <Icon
                viewBox="0 0 24 24"
                boxSize={4}
                mr={1.5}
                fill="none"
                stroke="currentColor"
                transform="translateY(-1.5px)"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </Icon>
              Automated Testing
            </Heading>
            <Text fontSize="xs">
              Packages can be tested prior to deployment to ensure
              implementations are robust. Continuous integration pipelines can
              integrate with Cannon to create and maintain sophisticated
              end-to-end testing scenarios.
            </Text>
          </Box>
          <Box
            p={3}
            borderRadius="md"
            border="1px solid"
            borderColor="gray.700"
          >
            <Heading size="xs" mb={1}>
              <Icon
                viewBox="0 0 24 24"
                boxSize={4}
                mr={1.5}
                fill="none"
                stroke="currentColor"
                transform="translateY(-1.5px)"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="16 12 12 8 8 12"></polyline>
                <line x1="12" y1="16" x2="12" y2="8"></line>
              </Icon>
              Deployment, Configuration, and Upgrades
            </Heading>
            <Text fontSize="xs">
              When protocols are ready for deployment, the same cannonfiles used
              during development can be built on live networks. Cannon also
              enables a{' '}
              <Link
                isExternal
                href="https://github.com/Synthetixio/synthetix-deployments"
              >
                GitOps workflow
              </Link>{' '}
              for managing configurable/upgradable protocols.
            </Text>
          </Box>
        </SimpleGrid>

        <Link href={links.GETSTARTED} color="white" as={NextLink}>
          <Button
            colorScheme="teal"
            size={['sm', 'sm', 'md']}
            letterSpacing="0.5px"
            fontWeight="bold"
            fontFamily="var(--font-miriam)"
            textTransform="uppercase"
          >
            Get Started
          </Button>
        </Link>
      </Box>
    </Flex>
  );
};
