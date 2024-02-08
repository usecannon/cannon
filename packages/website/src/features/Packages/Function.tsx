import React, { FC, useMemo, useState } from 'react';
import { AbiFunction, Abi } from 'abitype/src/abi';

import { ChainArtifacts } from '@usecannon/builder';
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
} from '@chakra-ui/react';
import { FunctionInput } from '@/features/Packages/FunctionInput';
import { FunctionOutput } from '@/features/Packages/FunctionOutput';
import {
  useAccount,
  useConnect,
  useNetwork,
  usePublicClient,
  useSwitchNetwork,
  useWalletClient,
} from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Address, zeroAddress } from 'viem';
import { handleTxnError } from '@usecannon/builder';
import { ethers } from 'ethers'; // Remove after the builder is refactored to viem. (This is already a dependency via builder.)
import { CustomSpinner } from '@/components/CustomSpinner';
import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons';
import { useContractCall, useContractTransaction } from '@/hooks/ethereum';

export const Function: FC<{
  f: AbiFunction;
  abi: Abi;
  address: string;
  cannonOutputs: ChainArtifacts;
  chainId: number;
}> = ({ f, abi, cannonOutputs, address, chainId }) => {
  const [loading, setLoading] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [error, setError] = useState<any>(null);
  const [params, setParams] = useState<any[] | any>([]);
  const { isConnected, address: from } = useAccount();
  const { connectAsync } = useConnect();
  const { openConnectModal } = useConnectModal();
  const { chain: connectedChain } = useNetwork();

  const publicClient = usePublicClient({
    chainId: chainId as number,
  });
  const { switchNetworkAsync } = useSwitchNetwork();
  const { data: walletClient } = useWalletClient({
    chainId: chainId as number,
  });

  const [readContractResult, fetchReadContractResult] = useContractCall(
    address as Address,
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

  // useEffect(() => {
  //   _.debounce(() => {
  //     if (readOnly && f.inputs.length === params.length) {
  //       void submit();
  //     }
  //   }, 200)();
  // }, [params, readOnly]);
  //

  const submit = async (suppressError = false, simulate = false) => {
    setLoading(true);
    setError(null);
    setSimulated(simulate);

    try {
      if (readOnly) {
        await fetchReadContractResult(zeroAddress);
      } else {
        if (!isConnected) {
          try {
            await connectAsync?.();
          } catch (e) {
            if (openConnectModal) openConnectModal();
            return;
          }
        }

        if (connectedChain?.id != chainId) {
          const newChain = await switchNetworkAsync?.(chainId as number);
          if (newChain?.id != chainId) return;
        }

        if (simulate) {
          await fetchReadContractResult(from);
        } else {
          await fetchWriteContractResult();
        }
      }
    } catch (e: any) {
      if (!suppressError) {
        // console.error(e);
        // setError(e?.message || e?.error?.message || e?.error || e);
        try {
          const provider = new ethers.providers.JsonRpcProvider(
            publicClient?.chain?.rpcUrls?.public?.http[0] as string
          );
          await handleTxnError(cannonOutputs, provider, e);
        } catch (e2: any) {
          setError(
            typeof e2 === 'string'
              ? e2
              : e2?.message || e2?.error?.message || e2?.error || e2
          );
        }
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

  function sanitizeForIdAndURI(anchor: string) {
    let sanitized = encodeURIComponent(anchor);
    sanitized = sanitized.replace(/%20/g, '_');
    if (/^[0-9]/.test(sanitized)) {
      sanitized = 'id_' + sanitized;
    }
    sanitized = sanitized.replace(/[^a-zA-Z0-9\-_]/g, '');
    return sanitized;
  }

  const anchor = sanitizeForIdAndURI(
    `${f.name}(${f.inputs
      .map((i) => `${i.type}${i.name ? ' ' + i.name : ''}`)
      .join(',')})`
  );

  return (
    <Box p={6} borderTop="1px solid" borderColor="gray.600" id={anchor}>
      <Box maxW="container.xl">
        <Flex alignItems="center" mb="4">
          <Heading size="sm" fontFamily="mono" fontWeight="semibold" mb={0}>
            {f.name}(
            {f.inputs
              .map((i) => i.type + (i.name ? ' ' + i.name : ''))
              .join(',')}
            )
            <Link
              color="gray.300"
              ml={1}
              textDecoration="none"
              _hover={{ textDecoration: 'underline' }}
              href={`#${anchor}`}
            >
              #
            </Link>
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
                <FunctionOutput result={result} output={f.outputs} />
              </Box>
            )}
          </Box>
        </Flex>
      </Box>
    </Box>
  );
};
