import { CustomSpinner } from '@/components/CustomSpinner';
import { FunctionInput } from '@/features/Packages/FunctionInput';
import { FunctionOutput } from '@/features/Packages/FunctionOutput';
import { useQueueTxsStore, useStore } from '@/helpers/store';
import { useContractCall, useContractTransaction } from '@/hooks/ethereum';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  WarningIcon,
} from '@chakra-ui/icons';
import {
  Alert,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputRightAddon,
  Link,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { ChainArtifacts } from '@usecannon/builder';
import { Abi, AbiFunction } from 'abitype';
import { useRouter } from 'next/router';
import React, { FC, useEffect, useRef, useState } from 'react';
import { FaCode } from 'react-icons/fa6';
import {
  Address,
  createPublicClient,
  encodeFunctionData,
  parseEther,
  toFunctionSelector,
  toFunctionSignature,
  TransactionRequestBase,
  zeroAddress,
} from 'viem';
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi';

const extractError = (e: any): string => {
  return typeof e === 'string'
    ? e
    : e?.message || e?.error?.message || e?.error || e;
};

const _isReadOnly = (abiFunction: AbiFunction) =>
  abiFunction.stateMutability === 'view' ||
  abiFunction.stateMutability === 'pure';

const _isPayable = (abiFunction: AbiFunction) =>
  abiFunction.stateMutability === 'payable';

const StatusIcon = ({ error }: { error: boolean }) => (
  <Box display="inline-block" ml={2}>
    {error ? (
      <WarningIcon color="red.700" />
    ) : (
      <CheckCircleIcon color="green.500" />
    )}
  </Box>
);

export const Function: FC<{
  selected?: boolean;
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
  selected,
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
  const [methodCallOrQueuedResult, setMethodCallOrQueuedResult] = useState<{
    value: unknown;
    error: string | null;
  } | null>(null);
  const [hasExpandedSelected, setHasExpandedSelected] = useState(false);

  // TODO: don't know why, had to use a ref instead of an array to be able to
  // keep the correct reference.
  const sadParams = useRef(new Array(f.inputs.length).fill(undefined));
  const [params, setParams] = useState<any[] | any>([...sadParams.current]);

  const { getChainById, transports } = useCannonChains();
  const chain = getChainById(chainId);
  const publicClient = createPublicClient({
    chain,
    transport: transports[chainId],
  });

  const setParam = (index: number, value: any) => {
    sadParams.current[index] = value;
    setParams([...sadParams.current]);
  };

  // for payable functions only
  const [value, setValue] = useState<any>();
  const [valueIsValid, setValueIsValid] = useState<boolean>(true);
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

  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient({
    chainId: chainId as number,
  })!;

  const fetchReadContractResult = useContractCall(
    address,
    f.name,
    [...params],
    abi,
    publicClient
  );

  const fetchWriteContractResult = useContractTransaction(
    from as Address,
    address as Address,
    f.name,
    [...params],
    abi,
    publicClient,
    walletClient as any
  );

  const isFunctionReadOnly = _isReadOnly(f);
  const isFunctionPayable = _isPayable(f);

  const submit = async ({ simulate = false }: { simulate?: boolean } = {}) => {
    setLoading(true);
    setMethodCallOrQueuedResult(null);
    setSimulated(simulate);

    try {
      if (isFunctionReadOnly) {
        await handleReadFunction();
      } else {
        await handleWriteFunction(simulate);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReadFunction = async () => {
    const result = await fetchReadContractResult(from ?? zeroAddress);
    if (result.error) {
      setMethodCallOrQueuedResult({
        value: null,
        error: extractError(result.error),
      });
    } else {
      setMethodCallOrQueuedResult({ value: result.value, error: null });
    }
  };

  const handleWriteFunction = async (simulate: boolean) => {
    if (!isConnected) {
      if (openConnectModal) openConnectModal();
      return;
    }

    if (connectedChain?.id !== chainId) {
      await switchChain({ chainId: chainId });
    }

    if (simulate) {
      await handleReadFunction();
    } else {
      const result = await fetchWriteContractResult();
      if (result.error) {
        setMethodCallOrQueuedResult({
          value: null,
          error: extractError(result.error),
        });
      } else {
        setMethodCallOrQueuedResult({ value: result.value, error: null });
      }
    }
  };

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
          isFunctionPayable && value !== undefined
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
            isFunctionPayable && value !== undefined
              ? parseEther(value.toString())
              : undefined,
        };
      } catch (err: unknown) {
        setMethodCallOrQueuedResult({
          value: null,
          error: extractError(err),
        });
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

            {isFunctionPayable && (
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
                    isInvalid={!valueIsValid}
                    borderColor="whiteAlpha.400"
                    value={value?.toString()}
                    onChange={(e) => {
                      setValue(e.target.value);
                      try {
                        parseEther(e.target.value);
                        setValueIsValid(true);
                      } catch (err) {
                        setValueIsValid(false);
                      }
                    }}
                  />
                  <InputRightAddon
                    bg="black"
                    color="whiteAlpha.700"
                    borderColor="whiteAlpha.400"
                  >
                    ETH
                  </InputRightAddon>
                </InputGroup>
                <FormHelperText hidden={!valueIsValid} color="gray.300">
                  {value !== undefined && valueIsValid
                    ? parseEther(value.toString()).toString()
                    : 0}{' '}
                  wei
                </FormHelperText>
              </FormControl>
            )}

            {isFunctionReadOnly && (
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
                  void submit();
                }}
              >
                Call view function
              </Button>
            )}

            {!isFunctionReadOnly && (
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
                  lineHeight="inherit"
                  onClick={async () => await submit({ simulate: true })}
                >
                  Simulate transaction{' '}
                  {simulated && methodCallOrQueuedResult && (
                    <StatusIcon
                      error={Boolean(methodCallOrQueuedResult.error)}
                    />
                  )}
                </Button>
                <Button
                  isLoading={loading}
                  colorScheme="teal"
                  bg="teal.900"
                  _hover={{ bg: 'teal.800' }}
                  variant="outline"
                  size="xs"
                  mr={3}
                  mb={3}
                  lineHeight="inherit"
                  onClick={async () => await submit()}
                >
                  Submit using wallet{' '}
                  {!simulated && methodCallOrQueuedResult && (
                    <StatusIcon
                      error={Boolean(methodCallOrQueuedResult.error)}
                    />
                  )}
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

            {methodCallOrQueuedResult?.error && (
              <Alert overflowX="scroll" mt="2" status="error" bg="red.700">
                {`${
                  methodCallOrQueuedResult.error.includes(
                    'Encoded error signature'
                  ) &&
                  methodCallOrQueuedResult.error.includes('not found on ABI')
                    ? 'Error emitted during ERC-7412 orchestration: '
                    : ''
                }${methodCallOrQueuedResult.error}`}
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
                {f.outputs.length != 0 && methodCallOrQueuedResult == null && (
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
                    {isFunctionReadOnly
                      ? 'Call the view function '
                      : 'Simulate the transaction '}
                    for output
                  </Flex>
                )}
                <FunctionOutput
                  result={methodCallOrQueuedResult?.value || null}
                  output={f.outputs}
                />
              </Box>
            )}
          </Box>
        </Flex>
      </Box>
    </Box>
  );

  useEffect(() => {
    if (!hasExpandedSelected && selected && !isOpen) {
      onToggle();
      setHasExpandedSelected(true);
    }
  }, [selected, isOpen, onToggle, hasExpandedSelected]);

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
                maxWidth="100%"
                whiteSpace="normal"
                wordBreak="break-word"
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
