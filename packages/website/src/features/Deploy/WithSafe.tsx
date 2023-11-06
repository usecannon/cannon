import { ReactNode } from 'react';
import { useStore } from '@/helpers/store';
import { SafeAddressInput } from './SafeAddressInput';
import { Flex, Box, Text, Image, Link } from '@chakra-ui/react';
import { useAccount } from 'wagmi';

export default function WithSafe({ children }: { children: ReactNode }) {
  const currentSafe = useStore((s) => s.currentSafe);
  const { isConnected } = useAccount();

  return (
    <Flex direction="column" flex="1">
      <Flex
        direction={{ base: 'column', lg: 'row' }}
        p={3}
        alignItems={{ base: 'flex-start', lg: 'center' }}
        borderBottom="1px solid"
        borderColor="gray.700"
      >
        <Box w="100%" maxW={{ lg: 'container.sm' }} mb={{ base: 2, lg: 0 }}>
          <SafeAddressInput />
        </Box>
        <Box
          ml={{ lg: 'auto' }}
          bg="gray.700"
          color="gray.300"
          border="1px solid"
          borderColor="gray.900"
          borderRadius="md"
          py={1}
          px={2}
          fontSize="xs"
          letterSpacing="0.2px"
          w={{ base: '100%', lg: 'auto' }}
        >
          🚧&nbsp;&nbsp;The web deployer is currently under
          construction&nbsp;&nbsp;🚧
        </Box>
      </Flex>
      {currentSafe ? (
        children
      ) : (
        <Flex
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          p={3}
          flex="1"
          w="100%"
          direction="column"
          bg="blackAlpha.600"
          mb={{ base: 2, lg: 0 }}
        >
          <Text fontSize="lg" color="gray.200" mb="2">
            Queue, sign, and execute deployments using a
            <Link
              display="inline-block"
              isExternal
              mx="2"
              href="https://safe.global/"
              color="gray.200"
              textDecoration="none"
              _hover={{ textDecoration: 'none' }}
              transform="translateY(3px)"
              opacity="0.8"
            >
              <Image
                height="18px"
                src="/images/safe.svg"
                alt="Safe"
                objectFit="cover"
              />
            </Link>
          </Text>
          <Text color="gray.300" fontSize="xs" letterSpacing="0.2px">
            {isConnected ? 'S' : 'Connect a wallet and s'}elect a Safe from the
            dropdown above.
          </Text>
        </Flex>
      )}
    </Flex>
  );
}
