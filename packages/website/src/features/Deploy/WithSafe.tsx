import { ReactNode } from 'react';
import { useStore } from '@/helpers/store';
import { Flex, Text, Image, Link, Spinner } from '@chakra-ui/react';
import { useAccount, useBytecode } from 'wagmi';
import PrepareNetwork from './PrepareNetwork';
import * as onchainStore from '../../helpers/onchain-store';
import * as multicallForwarder from '../../helpers/trusted-multicall-forwarder';

export default function WithSafe({ children }: { children: ReactNode }) {
  const currentSafe = useStore((s) => s.currentSafe);
  // Uncomment the following line to use test with local network
  // const currentSafe = { chainId: 31337 };
  const { isConnected } = useAccount();

  const onchainStoreBytecode = useBytecode({
    chainId: currentSafe?.chainId,
    address: onchainStore.deployAddress,
  });

  const multicallForwarderBytecode = useBytecode({
    chainId: currentSafe?.chainId,
    address: multicallForwarder.deployAddress,
  });

  const isNetworkPrepared =
    (onchainStoreBytecode?.data?.length || 0) > 0 &&
    (multicallForwarderBytecode?.data?.length || 0) > 0;

  const isLoadingNetworkPrepared =
    onchainStoreBytecode.isPending || multicallForwarderBytecode.isPending;

  const handleNetworkPrepared = async () => {
    // Refresh bytecode
    await onchainStoreBytecode.refetch();
    await multicallForwarderBytecode.refetch();
  };

  return (
    <Flex direction="column" flex="1">
      {currentSafe ? (
        isLoadingNetworkPrepared ? (
          <Spinner m="auto" size="lg" />
        ) : isNetworkPrepared ? (
          children
        ) : (
          <PrepareNetwork onNetworkPrepared={handleNetworkPrepared} />
        )
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
