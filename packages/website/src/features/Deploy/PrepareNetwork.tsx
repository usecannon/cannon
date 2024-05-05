import {
  Flex,
  Container,
  Heading,
  Text,
  Box,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import CustomButton from './CustomButton';
import {
  useGasPrice,
  usePrepareTransactionRequest,
  usePublicClient,
  useSendTransaction,
  useBytecode,
  useAccount,
  useSwitchChain,
} from 'wagmi';
import { useStore } from '@/helpers/store';
import * as onchainStore from '../../helpers/onchain-store';
import * as multicallForwarder from '../../helpers/trusted-multicall-forwarder';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { useCallback, useEffect } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';

const ARACHNID_CREATOR = '0x3fab184622dc19b6109349b94811493bf2a45362';
const DETERMINISTIC_DEPLOYER = '0x4e59b44847b379578588920ca78fbf26c0b4956c';

export default function PrepareNetwork({
  onNetworkPrepared,
}: {
  onNetworkPrepared: () => void;
}) {
  const { isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();
  const currentSafe = useStore((s) => s.currentSafe);
  // Uncomment the following line to use test with local network
  // const currentSafe = { chainId: 31337 };
  const toast = useToast();

  useEffect(() => {
    if (!isConnected && openConnectModal) {
      openConnectModal();
    }

    if (chainId !== currentSafe?.chainId) {
      switchChain({ chainId: currentSafe ? currentSafe.chainId : 1 });
    }
  }, [openConnectModal, isConnected, chainId]);

  const deterministicDeployerBytecode = useBytecode({
    chainId: currentSafe?.chainId,
    address: DETERMINISTIC_DEPLOYER,
  });
  const arachnidDeployed =
    (deterministicDeployerBytecode?.data?.length || 0) > 0;

  const gasPrice = useGasPrice();
  const publicClient = usePublicClient();
  const execTxnArachnid = useSendTransaction({
    mutation: {
      onSuccess: async () => {
        const hash = await publicClient!.sendRawTransaction({
          serializedTransaction:
            '0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222',
        });

        await publicClient!.waitForTransactionReceipt({ hash });

        await deterministicDeployerBytecode.refetch();

        toast({
          title: 'Deterministic Deployer Deployed',
          description: 'The deterministic deployer has been deployed.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      },
    },
  });

  const handleDeployArachnid = useCallback(() => {
    execTxnArachnid.sendTransaction({
      to: ARACHNID_CREATOR,
      // TODO: What is the right value here?
      value: BigInt(10000000000000000),
    });
  }, [
    isConnected,
    openConnectModal,
    chainId,
    currentSafe,
    switchChain,
    execTxnArachnid,
    gasPrice,
  ]);

  const onchainStoreBytecode = useBytecode({
    chainId: currentSafe?.chainId,
    address: onchainStore.deployAddress,
  });
  const onchainStoreDeployed = (onchainStoreBytecode?.data?.length || 0) > 0;
  const deployOnchainStore = usePrepareTransactionRequest({
    ...onchainStore.deployTxn,
    gasPrice: gasPrice.data,
    // TODO: What is the right value here?
    gas: BigInt(2000000),
  });
  const deployOnchainStoreTransaction = useSendTransaction({
    mutation: {
      onSuccess: async () => {
        await onchainStoreBytecode.refetch();

        toast({
          title: 'Onchain Store Deployed',
          description: 'The onchain store has been deployed.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      },
    },
  });

  const handleDeployOnchainStore = () => {
    deployOnchainStoreTransaction.sendTransaction(
      deployOnchainStore.data as any
    );
  };

  const multicallForwarderBytecode = useBytecode({
    chainId: currentSafe?.chainId,
    address: multicallForwarder.deployAddress,
  });
  const multicallForwarderDeployed =
    (multicallForwarderBytecode?.data?.length || 0) > 0;
  const deployMulticallForwarder = usePrepareTransactionRequest({
    ...multicallForwarder.deployTxn,
    gasPrice: gasPrice.data,
    // TODO: What is the right value here?
    gas: BigInt(30000000),
  });
  const deployMulticallForwarderTransaction = useSendTransaction({
    mutation: {
      onSuccess: async () => {
        await multicallForwarderBytecode.refetch();

        toast({
          title: 'Multicall Forwarder Deployed',
          description: 'The multicall forwarder has been deployed.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      },
    },
  });

  const handleDeployMulticallForwarder = () => {
    deployMulticallForwarderTransaction.sendTransaction(
      deployMulticallForwarder.data as any
    );
  };

  // Check if all contracts are deployed, then call onNetworkPrepared
  useEffect(() => {
    if (
      arachnidDeployed &&
      onchainStoreDeployed &&
      multicallForwarderDeployed
    ) {
      onNetworkPrepared();
    }
  }, [arachnidDeployed, onchainStoreDeployed, multicallForwarderDeployed]);

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
            <Flex gap={3} alignItems="center">
              <CustomButton
                href="#"
                disabled={arachnidDeployed || execTxnArachnid.isPending}
                onClick={handleDeployArachnid}
              >
                {arachnidDeployed ? 'Deployed' : 'Deploy Contract'}
              </CustomButton>
              <Tooltip label="This contract is deployed by sending a small amount of ETH to an EOA with a known private key. Then the contract is deployed from that address.">
                <InfoOutlineIcon color="gray.400" />
              </Tooltip>
            </Flex>
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
            <CustomButton
              href="#"
              disabled={
                !arachnidDeployed ||
                onchainStoreDeployed ||
                deployOnchainStore.isPending
              }
              onClick={handleDeployOnchainStore}
            >
              {onchainStoreDeployed ? 'Deployed' : 'Deploy Contract'}
            </CustomButton>
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
            <CustomButton
              href="#"
              disabled={
                !arachnidDeployed ||
                multicallForwarderDeployed ||
                deployMulticallForwarder.isPending
              }
              onClick={handleDeployMulticallForwarder}
            >
              {multicallForwarderDeployed ? 'Deployed' : 'Deploy Contract'}
            </CustomButton>
          </Box>
        </Flex>
      </Container>
    </Flex>
  );
}
