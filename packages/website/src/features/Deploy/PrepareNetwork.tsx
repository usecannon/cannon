import { Flex, Container, Heading, Text, Box, Button } from '@chakra-ui/react';
import { CustomLinkButton } from '../HomePage/HomePage';

export default function PrepareNetwork() {
  return (
    <Flex height="100%" bg="black">
      <Container maxW="container.xl" my="auto" py={8}>
        <Heading
          size="md"
          mb={6}
          textShadow="0px 0px 4px rgba(63, 211, 203, 0.8);"
        >
          The web deployer needs some contracts on this chain. Anyone can deploy
          them.
        </Heading>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          gap={8}
          align="stretch"
          wrap="wrap"
        >
          <Box
            bg="gray.800"
            border="1px solid"
            borderColor="gray.600"
            borderRadius="sm"
            p={5}
            w={{ base: '100%', md: '320px' }}
          >
            <Heading size="sm" mb={2}>
              Deterministic Deployment Proxy
            </Heading>
            <Text fontSize="sm" color="gray.300" mb={3}>
              This allows contracts to be deployed at consistent addresses,
              determined based on their source code.
            </Text>
            <CustomLinkButton href="#" size="sm" colorScheme="teal" disabled>
              Deployed
            </CustomLinkButton>
          </Box>
          <Box
            bg="gray.800"
            border="1px solid"
            borderColor="gray.600"
            borderRadius="sm"
            p={5}
            w={{ base: '100%', md: '320px' }}
          >
            <Heading size="sm" mb={2}>
              Upgrade Verification Contract
            </Heading>
            <Text fontSize="sm" color="gray.300" mb={3}>
              This allows the deployer to record IPFS and git hashes onchain to
              verify the integrity of upgrades.
            </Text>
            <CustomLinkButton href="#" size="sm" colorScheme="teal">
              Deploy Contract
            </CustomLinkButton>
          </Box>
          <Box
            bg="gray.800"
            border="1px solid"
            borderColor="gray.600"
            borderRadius="sm"
            p={5}
            w={{ base: '100%', md: '320px' }}
          >
            <Heading size="sm" mb={2}>
              Trusted Multicall Forwarder
            </Heading>
            <Text fontSize="sm" color="gray.300" mb={3}>
              This allows users to create atomic batch transactions across
              integrated protocols, like the Cannon Registry.
            </Text>
            <CustomLinkButton href="#" size="sm" colorScheme="teal">
              Deploy Contract
            </CustomLinkButton>
          </Box>
        </Flex>
      </Container>
    </Flex>
  );
}
