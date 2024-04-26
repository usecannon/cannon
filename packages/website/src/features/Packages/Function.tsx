import { CustomSpinner } from '@/components/CustomSpinner';
import { FunctionInput } from '@/features/Packages/FunctionInput';
import { FunctionOutput } from '@/features/Packages/FunctionOutput';
import { useContractCall, useContractTransaction } from '@/hooks/ethereum';
import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons';
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
} from '@chakra-ui/react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { ChainArtifacts } from '@usecannon/builder';
import { Abi, AbiFunction } from 'abitype/src/abi';
import React, { FC, useMemo, useState } from 'react';
import {
  Address,
  toFunctionSelector,
  toFunctionSignature,
  zeroAddress,
  encodeFunctionData,
  TransactionRequestBase,
} from 'viem';
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from 'wagmi';
import { usePathname } from 'next/navigation';
import { useQueueTxsStore } from '@/helpers/store';

export const Function: FC<{
  f: AbiFunction;
  abi: Abi;
  address: Address;
  cannonOutputs: ChainArtifacts;
  chainId: number;
  contractSource?: string;
}> = ({ f, abi /*, cannonOutputs */, address, chainId, contractSource }) => {
  const pathName = usePathname();
  const [loading, setLoading] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [error, setError] = useState<any>(null);
  const [params, setParams] = useState<any[] | any>([]);
  const toast = useToast();

  const {
    queuedIdentifiableTxns,
    setQueuedIdentifiableTxns,
    lastQueuedTxnsId,
    setLastQueuedTxnsId,
  } = useQueueTxsStore((s) => s);

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
    params,
    abi,
    publicClient
  );

  const [writeContractResult, fetchWriteContractResult] =
    useContractTransaction(
      from as Address,
      address as Address,
      f.name,
      params,
      abi,
      publicClient,
      walletClient as any
    );

  const readOnly = useMemo(
    () => f.stateMutability == 'view' || f.stateMutability == 'pure',
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
    <Box display="inline-block" mr={3}>
      {error ? (
        <WarningIcon color="red.700" />
      ) : (
        <CheckCircleIcon color="green.500" />
      )}
    </Box>
  ) : null;

  const anchor = `selector-${toFunctionSelector(f)}`;

  const getCodeUrl = (functionName: string) => {
    const base = pathName.split('/interact')[0];
    const activeContractPath = pathName.split('interact/')[1];
    if (activeContractPath && contractSource) {
      const [moduleName] = activeContractPath.split('/');

      return `${base}/code/${moduleName}?source=${encodeURIComponent(
        contractSource
      )}&function=${functionName}`;
    }
  };

  const handleQueueTransaction = () => {
    // Prevent queuing transactions across different chains
    if (queuedIdentifiableTxns.length > 0) {
      const lastTxn = queuedIdentifiableTxns.slice(-1)[0];
      if (lastTxn.chainId !== chainId) {
        toast({
          title: 'Cannot queue transactions across different chains',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    }

    let _txn: Omit<TransactionRequestBase, 'from'> | null = null;

    if (f.inputs.length === 0) {
      _txn = {
        to: address,
        data: toFunctionSelector(f),
      };
    } else {
      try {
        _txn = {
          to: address,
          data: encodeFunctionData({
            abi: [f],
            args: params,
          }),
        };
      } catch (err: any) {
        setError(err.message);
        return;
      }
    }

    const regex = /\/([^/]+)\.sol$/;
    const contractName = contractSource?.match(regex)?.[1] || 'Unknown';

    setQueuedIdentifiableTxns([
      ...queuedIdentifiableTxns,
      {
        txn: _txn,
        id: `${lastQueuedTxnsId + 1}`,
        contractName,
        target: address,
        fn: f,
        params,
        chainId,
      },
    ]);
    setLastQueuedTxnsId(lastQueuedTxnsId + 1);

    toast({
      title: 'Transaction queued',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  return (
    <Box p={6} borderTop="1px solid" borderColor="gray.600">
      <span id={anchor} />
      <Box maxW="container.xl">
        <Flex alignItems="center" mb="4">
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
              href={`#${anchor}`}
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
                <FaCode color="#fff" />
              </Link>
            )}
          </Heading>
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
                      valueUpdated={(value) => {
                        const _params = [...params];
                        _params[index] = value;
                        setParams(_params);
                      }}
                    />
                  </FormControl>
                </Box>
              );
            })}

            {readOnly && (
              <Button
                isLoading={loading}
                colorScheme="teal"
                bg="teal.900"
                _hover={{ bg: 'teal.800' }}
                variant="outline"
                size="xs"
                mr={3}
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
                  onClick={() => {
                    void submit(false);
                  }}
                >
                  Submit using wallet {!simulated && statusIcon}
                </Button>
                <Button
                  isLoading={loading}
                  colorScheme="teal"
                  bg="teal.900"
                  _hover={{ bg: 'teal.800' }}
                  variant="outline"
                  size="xs"
                  mr={3}
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
            background="whiteAlpha.50"
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
};
