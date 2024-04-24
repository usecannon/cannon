import { Flex, Container, Heading, Text, Box, Button } from '@chakra-ui/react';
import { CustomLinkButton } from '../HomePage/HomePage';
import {
  useBalance,
  useGasPrice,
  usePrepareTransactionRequest,
  usePublicClient,
  useSendTransaction,
} from 'wagmi';

import * as onchainStore from '../../helpers/onchain-store';
import * as multicallForwarder from '../../helpers/trusted-multicall-forwarder';

export default function PrepareNetwork() {
  const ARACHNID_CREATOR = '0x3fab184622dc19b6109349b94811493bf2a45362';

  const arachnidCreatorBalance = useBalance({
    address: ARACHNID_CREATOR,
  });

  const gasPrice = useGasPrice();

  const publicClient = usePublicClient();

  const deployArachnidCreate2 = usePrepareTransactionRequest({
    to: ARACHNID_CREATOR,
    value:
      (gasPrice.data ?? BigInt(0)) * BigInt(110000) -
      (arachnidCreatorBalance.data?.value ?? BigInt(0)),
  });

  const deployKvStore = usePrepareTransactionRequest(onchainStore.deployTxn);

  const deployMulticallForwarder = usePrepareTransactionRequest(
    multicallForwarder.deployTxn
  );

  const execTxnArachnid = useSendTransaction({
    mutation: {
      onSuccess: async () => {
        const hash = await publicClient!.sendRawTransaction({
          serializedTransaction:
            '0x604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3',
        });

        await publicClient!.waitForTransactionReceipt({ hash });
      },
    },
  });

  const execTxn = useSendTransaction();

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
              determined based on their source code. NOTE: this contract is
              deployed by sending a small amount of ETH to a dedicated
              deployment address. The contract will be deployed immediately
              after funds are sent.
            </Text>
            <CustomLinkButton
              href="#"
              size="sm"
              colorScheme="teal"
              disabled
              // NOTE: seems wagmi types are borked again
              onClick={execTxnArachnid.sendTransaction(
                deployArachnidCreate2.data as any
              )}
            >
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
            <CustomLinkButton
              href="#"
              size="sm"
              colorScheme="teal"
              // NOTE: seems wagmi types are borked again
              onClick={execTxn.sendTransaction(deployKvStore.data as any)}
            >
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
            <CustomLinkButton
              href="#"
              size="sm"
              colorScheme="teal"
              // NOTE: seems wagmi types are borked again
              onClick={execTxn.sendTransaction(
                deployMulticallForwarder.data as any
              )}
            >
              Deploy Contract
            </CustomLinkButton>
          </Box>
        </Flex>
      </Container>
    </Flex>
  );
}
