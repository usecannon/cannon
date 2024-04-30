import { Flex, Container, Heading, Text, Box, Tooltip } from '@chakra-ui/react';
import { CustomLinkButton } from '../HomePage/HomePage';
import {
  useBalance,
  useGasPrice,
  usePrepareTransactionRequest,
  usePublicClient,
  useSendTransaction,
  useBytecode,
  useAccount,
  useSwitchChain,
} from 'wagmi';
import * as onchainStore from '../../helpers/onchain-store';
import * as multicallForwarder from '../../helpers/trusted-multicall-forwarder';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { useStore } from '@/helpers/store';
import { useEffect, useState } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';

export default function PrepareNetwork() {
  const [step, setStep] = useState(0);
  const { isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();
  const [contractToDeploy, setContractToDeploy] = useState('');
  const currentSafe = { chainId: 31337 }; //useStore((s) => s.currentSafe);

  const arachnidBytecode = useBytecode({
    chainId: currentSafe?.chainId,
    address: '0x4e59b44847b379578588920ca78fbf26c0b4956c',
  });
  const arachnidDeployed = (arachnidBytecode?.data?.length || 0) > 0;

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

  const onchainStoreBytecode = useBytecode({
    chainId: currentSafe?.chainId,
    address: onchainStore.deployAddress,
  });
  const onchainStoreDeployed = (onchainStoreBytecode?.data?.length || 0) > 0;
  const deployOnchainStore = usePrepareTransactionRequest(
    onchainStore.deployTxn
  );

  const multicallForwarderBytecode = useBytecode({
    chainId: currentSafe?.chainId,
    address: multicallForwarder.deployAddress,
  });
  const multicallForwarderDeployed =
    (multicallForwarderBytecode?.data?.length || 0) > 0;
  const deployMulticallForwarder = usePrepareTransactionRequest(
    multicallForwarder.deployTxn
  );

  const execTxn = useSendTransaction();

  useEffect(() => {
    if (step === 1 && openConnectModal) {
      isConnected ? setStep(2) : openConnectModal();
    } else if (step == 2) {
      chainId === currentSafe.chainId
        ? setStep(3)
        : switchChain({ chainId: currentSafe.chainId });
    } else if (step == 3) {
      if (contractToDeploy === 'arachnid') {
        execTxnArachnid.sendTransaction(deployArachnidCreate2.data as any);
      } else if (contractToDeploy === 'onchainstore') {
        execTxn.sendTransaction(deployOnchainStore.data as any);
      } else if (contractToDeploy === 'multicallForwarder') {
        execTxn.sendTransaction(deployMulticallForwarder.data as any);
      }
    }
  }, [openConnectModal, step, isConnected, chainId, contractToDeploy]);

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
              <CustomLinkButton
                href="#"
                disabled={arachnidDeployed}
                onClick={() => {
                  setContractToDeploy('arachnid');
                  setStep(1);
                }}
              >
                {arachnidDeployed ? 'Deployed' : 'Deploy Contract'}
              </CustomLinkButton>
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
            <CustomLinkButton
              href="#"
              disabled={!arachnidDeployed || onchainStoreDeployed}
              onClick={() => {
                setContractToDeploy('onchainstore');
                setStep(1);
              }}
            >
              {onchainStoreDeployed ? 'Deployed' : 'Deploy Contract'}
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
              disabled={!arachnidDeployed || multicallForwarderDeployed}
              onClick={() => {
                setContractToDeploy('multicallForwarder');
                setStep(1);
              }}
            >
              {multicallForwarderDeployed ? 'Deployed' : 'Deploy Contract'}
            </CustomLinkButton>
          </Box>
        </Flex>
      </Container>
    </Flex>
  );
}
