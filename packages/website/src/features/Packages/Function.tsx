import { CustomSpinner } from '@/components/CustomSpinner';
import { FunctionInput } from '@/features/Packages/FunctionInput';
import { FunctionOutput } from '@/features/Packages/FunctionOutput';
import { useContractCall, useContractTransaction } from '@/hooks/ethereum';
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  WarningIcon,
} from '@chakra-ui/icons';
import { FaCode } from 'react-icons/fa6';
import {
  Alert,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Link,
  Text,
  useToast,
  useDisclosure,
  Input,
  InputGroup,
  InputRightAddon,
  FormHelperText,
} from '@chakra-ui/react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { ChainArtifacts } from '@usecannon/builder';
import { Abi, AbiFunction } from 'abitype';
import React, { FC, useMemo, useRef, useState } from 'react';
import {
  Address,
  toFunctionSelector,
  toFunctionSignature,
  zeroAddress,
  encodeFunctionData,
  TransactionRequestBase,
  parseEther,
} from 'viem';
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from 'wagmi';
import { useRouter } from 'next/router';
import { useQueueTxsStore, useStore } from '@/helpers/store';

export const Function: FC<{
  f: AbiFunction;
  abi: Abi;
  address: Address;
  cannonOutputs: ChainArtifacts;
  chainId: number;
  contractSource?: string;
  onDrawerOpen?: () => void;
  collapsible?: boolean;
  showFunctionSelector: boolean;
  packageUrl?: string;
}> = ({
  f,
  abi /*, cannonOutputs */,
  address,
  chainId,
  contractSource,
  onDrawerOpen,
  collapsible,
  showFunctionSelector,
  packageUrl,
}) => {
  const { isOpen, onToggle } = useDisclosure();
  const currentSafe = useStore((s) => s.currentSafe);
  const { asPath: pathname } = useRouter();
  const [loading, setLoading] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [error, setError] = useState<any>(null);

  // TODO: don't know why, had to use a ref instead of an array to be able to
  // keep the correct reference.
  const sadParams = useRef(new Array(f.inputs.length).fill(undefined));
  const [params, setParams] = useState<any[] | any>([...sadParams.current]);

  const setParam = (index: number, value: any) => {
    sadParams.current[index] = value;
    setParams([...sadParams.current]);
  };

  // for payable functions only
  const [value, setValue] = useState<any>();
  const toast = useToast();

  const { safes, setQueuedIdentifiableTxns, setLastQueuedTxnsId } =
    useQueueTxsStore((s) => s);

  const queuedIdentifiableTxns =
    currentSafe?.address &&
    currentSafe?.chainId &&
    safes[`${currentSafe?.chainId}:${currentSafe?.address}`]
      ? safes[`${currentSafe?.chainId}:${currentSafe?.address}`]
          ?.queuedIdentifiableTxns
      : [];
  const lastQueuedTxnsId =
    currentSafe?.address &&
    currentSafe?.chainId &&
    safes[`${currentSafe?.chainId}:${currentSafe?.address}`]
      ? safes[`${currentSafe?.chainId}:${currentSafe?.address}`]
          ?.lastQueuedTxnsId
      : 0;

  const { isConnected, address: from, chain: connectedChain } = useAccount();
  const { openConnectModal } = useConnectModal();
  const publicClient = usePublicClient({
    chainId: chainId as number,
  })!;
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient({
    chainId: chainId as number,
  })!;

  const [readContractResult, fetchReadContractResult] = useContractCall(
    address,
    f.name,
    [...params],
    abi,
    publicClient
  );

  const [writeContractResult, fetchWriteContractResult] =
    useContractTransaction(
      from as Address,
      address as Address,
      f.name,
      [...params],
      abi,
      publicClient,
      walletClient as any
    );

  const readOnly = useMemo(
    () => f.stateMutability == 'view' || f.stateMutability == 'pure',
    [f.stateMutability]
  );

  const isPayable = useMemo(
    () => f.stateMutability == 'payable',
    [f.stateMutability]
  );

  const result = useMemo(
    () =>
      readOnly
        ? readContractResult
        : simulated
        ? readContractResult
        : writeContractResult,
    [readOnly, simulated, readContractResult, writeContractResult]
  );

  const submit = async (suppressError = false, simulate = false) => {
    setLoading(true);
    setError(null);
    setSimulated(simulate);

    try {
      if (readOnly) {
        await fetchReadContractResult(zeroAddress);
      } else {
        if (!isConnected) {
          if (openConnectModal) openConnectModal();
          return;
        }

        if (connectedChain?.id != chainId) {
          await switchChain({ chainId: chainId });
        }

        if (simulate) {
          await fetchReadContractResult(from);
        } else {
          await fetchWriteContractResult();
        }
      }
    } catch (e: any) {
      if (!suppressError) {
        setError(
          typeof e === 'string'
            ? e
            : e?.message || e?.error?.message || e?.error || e
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = result ? (
    <Box display="inline-block" mx={1}>
      {error ? (
        <WarningIcon color="red.700" />
      ) : (
        <CheckCircleIcon color="green.500" />
      )}
    </Box>
  ) : null;

  const anchor = `#selector-${toFunctionSelector(f)}`;

  const getCodeUrl = (functionName: string) => {
    const base = pathname.split('/interact')[0];
    const activeContractPath = pathname.split('interact/')[1];
    if (activeContractPath && contractSource) {
      const [moduleName] = activeContractPath.split('/');

      return `${base}/code/${moduleName}?source=${encodeURIComponent(
        contractSource
      )}&function=${functionName}`;
    }
  };

  const handleQueueTransaction = () => {
    if (!currentSafe) {
      toast({
        title: 'Please select a Safe first',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      onDrawerOpen?.();
      return;
    }
    // Prevent queuing transactions across different chains
    if (currentSafe?.chainId !== chainId) {
      toast({
        title: `Cannot queue transactions across different chains, current Safe is on chain ${currentSafe?.chainId} and function is on chain ${chainId}`,
        status: 'error',
        duration: 10000,
        isClosable: true,
      });
      onDrawerOpen?.();
      return;
    }

    let _txn: Omit<TransactionRequestBase, 'from'> | null = null;

    if (f.inputs.length === 0) {
      _txn = {
        to: address,
        data: toFunctionSelector(f),
        value:
          isPayable && value !== undefined
            ? parseEther(value.toString())
            : undefined,
      };
    } else {
      try {
        _txn = {
          to: address,
          data: encodeFunctionData({
            abi: [f],
            args: params,
          }),
          value:
            isPayable && value !== undefined
              ? parseEther(value.toString())
              : undefined,
        };
      } catch (err: any) {
        setError(err.message);
        return;
      }
    }

    const regex = /\/([^/]+)\.sol$/;
    const contractName = contractSource?.match(regex)?.[1] || 'Unknown';

    setQueuedIdentifiableTxns({
      queuedIdentifiableTxns: [
        ...queuedIdentifiableTxns,
        {
          txn: _txn,
          id: `${lastQueuedTxnsId + 1}`,
          contractName,
          target: address,
          fn: f,
          params: [...params],
          chainId,
          pkgUrl: packageUrl || '',
        },
      ],
      safeId: `${currentSafe.chainId}:${currentSafe.address}`,
    });
    setLastQueuedTxnsId({
      lastQueuedTxnsId: lastQueuedTxnsId + 1,
      safeId: `${currentSafe.chainId}:${currentSafe.address}`,
    });

    toast({
      title: `Total transactions queued: ${lastQueuedTxnsId + 1}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  const renderFunctionContent = () => (
    <Box
      p={6}
      borderTop={collapsible ? 'none' : '1px solid'}
      borderBottom={collapsible ? '1px solid' : 'none'}
      borderBottomRadius={collapsible ? 'md' : 'none'}
      borderRight={collapsible ? '1px solid' : 'none'}
      borderLeft={collapsible ? '1px solid' : 'none'}
      borderColor="gray.600"
      bg="gray.900"
    >
      <Box maxW="container.xl">
        <Flex alignItems="center" mb="4">
          {showFunctionSelector && (
            <Heading
              size="sm"
              fontFamily="mono"
              fontWeight="semibold"
              mb={0}
              display="flex"
              alignItems="center"
              gap={2}
            >
              {toFunctionSignature(f)}
              <Link
                color="gray.300"
                ml={1}
                textDecoration="none"
                _hover={{ textDecoration: 'underline' }}
                href={anchor}
              >
                #
              </Link>
              {!!contractSource && (
                <Link
                  color="gray.300"
                  ml={1}
                  textDecoration="none"
                  _hover={{ textDecoration: 'underline' }}
                  href={getCodeUrl(f.name)}
                >
                  <FaCode color="gray.300" />
                </Link>
              )}
            </Heading>
          )}
        </Flex>
        <Flex flexDirection={['column', 'column', 'row']} gap={8} height="100%">
          <Box flex="1" w={['100%', '100%', '50%']}>
            {f.inputs.map((input, index) => {
              return (
                <Box key={JSON.stringify(input)}>
                  <FormControl mb="4">
                    <FormLabel fontSize="sm" mb={1}>
                      {input.name && <Text display="inline">{input.name}</Text>}
                      {input.type && (
                        <Text
                          fontSize="xs"
                          color="whiteAlpha.700"
                          display="inline"
                        >
                          {' '}
                          {input.type}
                        </Text>
                      )}
                    </FormLabel>
                    <FunctionInput
                      input={input}
                      handleUpdate={(value) => {
                        setParam(index, value);
                      }}
                    />
                  </FormControl>
                </Box>
              );
            })}

            {isPayable && (
              <FormControl mb="4">
                <FormLabel fontSize="sm" mb={1}>
                  Value
                  <Text fontSize="xs" color="whiteAlpha.700" display="inline">
                    {' '}
                    (payable)
                  </Text>
                </FormLabel>
                <InputGroup size="sm">
                  <Input
                    type="number"
                    size="sm"
                    bg="black"
                    borderColor="whiteAlpha.400"
                    value={value?.toString()}
                    onChange={(e) => setValue(e.target.value)}
                  />
                  <InputRightAddon
                    bg="black"
                    color="whiteAlpha.700"
                    borderColor="whiteAlpha.400"
                  >
                    ETH
                  </InputRightAddon>
                </InputGroup>
                <FormHelperText color="gray.300">
                  {value !== undefined
                    ? parseEther(value.toString()).toString()
                    : 0}{' '}
                  wei
                </FormHelperText>
              </FormControl>
            )}

            {readOnly && (
              <Button
                isLoading={loading}
                colorScheme="teal"
                bg="teal.900"
                _hover={{ bg: 'teal.800' }}
                variant="outline"
                size="xs"
                mr={3}
                mb={3}
                onClick={() => {
                  void submit(false);
                }}
              >
                Call view function
              </Button>
            )}

            {!readOnly && (
              <>
                <Button
                  isLoading={loading}
                  colorScheme="teal"
                  bg="teal.900"
                  _hover={{ bg: 'teal.800' }}
                  variant="outline"
                  size="xs"
                  mr={3}
                  mb={3}
                  onClick={() => {
                    void submit(false, true);
                  }}
                >
                  Simulate transaction
                </Button>
                {simulated && statusIcon}
                <Button
                  isLoading={loading}
                  colorScheme="teal"
                  bg="teal.900"
                  _hover={{ bg: 'teal.800' }}
                  variant="outline"
                  size="xs"
                  mr={3}
                  mb={3}
                  onClick={() => {
                    void submit(false);
                  }}
                >
                  Submit using wallet {!simulated && statusIcon}
                </Button>
                <Button
                  id={`${f.name}-stage-to-safe`}
                  isLoading={loading}
                  colorScheme="teal"
                  bg="teal.900"
                  _hover={{ bg: 'teal.800' }}
                  variant="outline"
                  size="xs"
                  mr={3}
                  mb={3}
                  onClick={handleQueueTransaction}
                >
                  Stage to Safe
                </Button>
              </>
            )}

            {error && (
              <Alert overflowX="scroll" mt="2" status="error" bg="red.700">
                {`${
                  error.includes('Encoded error signature') &&
                  error.includes('not found on ABI')
                    ? 'Error emitted during ERC-7412 orchestration: '
                    : ''
                }${error}`}
              </Alert>
            )}
          </Box>
          <Box
            flex="1"
            w={['100%', '100%', '50%']}
            background="gray.800"
            borderRadius="md"
            p={4}
            display="flex"
            flexDirection="column"
            position="relative"
            overflowX="scroll"
          >
            <Heading
              size="xs"
              textTransform={'uppercase'}
              fontWeight={400}
              letterSpacing={'1px'}
              fontFamily={'var(--font-miriam)'}
              color="gray.300"
              mb={2}
            >
              Output
            </Heading>

            {loading ? (
              <CustomSpinner m="auto" />
            ) : (
              <Box flex="1">
                {f.outputs.length != 0 && result == null && (
                  <Flex
                    position="absolute"
                    zIndex={2}
                    top={0}
                    left={0}
                    background="blackAlpha.700"
                    width="100%"
                    height="100%"
                    alignItems="center"
                    justifyContent="center"
                    fontWeight="medium"
                    color="gray.300"
                    textShadow="sm"
                    letterSpacing="0.1px"
                  >
                    {readOnly
                      ? 'Call the view function '
                      : 'Simulate the transaction '}
                    for output
                  </Flex>
                )}
                <FunctionOutput
                  result={!error ? result : null}
                  output={f.outputs}
                />
              </Box>
            )}
          </Box>
        </Flex>
      </Box>
    </Box>
  );

  return (
    <>
      {collapsible ? (
        <Flex flexDirection="column">
          <Flex
            flexDirection="row"
            px="3"
            py="2"
            alignItems="center"
            justifyContent="space-between"
            border="1px solid"
            borderColor="gray.600"
            borderTopRadius={'sm'}
            borderBottomRadius={isOpen ? 'none' : 'sm'}
            id={anchor}
            onClick={onToggle}
            cursor="pointer"
            bg="gray.900"
          >
            {f.name && (
              <Heading
                size="sm"
                fontFamily="mono"
                fontWeight="semibold"
                mb={0}
                display="flex"
                alignItems="center"
                gap={2}
              >
                {toFunctionSignature(f)}
                <Link
                  color="gray.300"
                  ml={1}
                  textDecoration="none"
                  _hover={{ textDecoration: 'none' }}
                  href={anchor}
                  onClick={(e) => e.stopPropagation()}
                >
                  #
                </Link>
                {!!contractSource && (
                  <Link
                    color="gray.300"
                    ml={1}
                    textDecoration="none"
                    _hover={{ textDecoration: 'none' }}
                    href={getCodeUrl(f.name)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FaCode color="gray.300" />
                  </Link>
                )}
              </Heading>
            )}
            {isOpen ? (
              <ChevronUpIcon boxSize="5" />
            ) : (
              <ChevronDownIcon boxSize="5" />
            )}
          </Flex>
          {isOpen && renderFunctionContent()}
        </Flex>
      ) : (
        renderFunctionContent()
      )}
    </>
  );
};
