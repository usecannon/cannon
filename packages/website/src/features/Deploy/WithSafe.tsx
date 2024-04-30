import { ReactNode } from 'react';
import { useStore } from '@/helpers/store';
import { Flex, Text, Image, Link } from '@chakra-ui/react';
import { useAccount } from 'wagmi';

export default function WithSafe({ children }: { children: ReactNode }) {
  const currentSafe = useStore((s) => s.currentSafe);
  const { isConnected } = useAccount();

  return (
    <Flex direction="column" flex="1">
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
