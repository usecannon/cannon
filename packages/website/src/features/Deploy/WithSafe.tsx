import { ReactNode } from 'react';
import { useStore } from '@/helpers/store';
import { SafeAddressInput } from './SafeAddressInput';
import { Flex, Box, Text, Image, Link } from '@chakra-ui/react';
import { useAccount } from 'wagmi';
import { EditIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';

export default function WithSafe({ children }: { children: ReactNode }) {
  const currentSafe = useStore((s) => s.currentSafe);
  const stagingUrl = useStore((s) => s.settings.stagingUrl);
  const { isConnected } = useAccount();

  return (
    <Flex direction="column" flex="1">
      <Flex
        direction={{ base: 'column', lg: 'row' }}
        alignItems={{ base: 'flex-start', lg: 'center' }}
        borderBottom="1px solid"
        borderColor="gray.700"
      >
        <Box
          p={3}
          w="100%"
          maxW={{ lg: 'container.sm' }}
          mb={{ base: 2, lg: 0 }}
        >
          <SafeAddressInput />
        </Box>
        <Flex
          px={4}
          pb={{ base: 4, lg: 0 }}
          height="100%"
          alignItems={{ base: 'flex-start', lg: 'center' }}
          ml={{ lg: 'auto' }}
          borderLeft={{ lg: '1px solid' }}
          borderColor={{ lg: 'gray.700' }}
        >
          <Box>
            <Text fontSize="sm" color="gray.200">
              Safe Signature Collection Service
            </Text>
            <Text fontSize="xs">
              {stagingUrl?.length ? (
                stagingUrl
              ) : (
                <Text display="inline" color="gray.400">
                  None
                </Text>
              )}
              <Link as={NextLink} href="/settings" ml={1} color="gray.300">
                <EditIcon transform="translateY(-1px)" />
              </Link>
            </Text>
          </Box>
        </Flex>
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
