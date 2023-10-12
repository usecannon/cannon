import React, { FC, useEffect, useMemo, useState } from 'react';
import { AbiFunction, Abi } from 'abitype/src/abi';

import { ChainArtifacts } from '@usecannon/builder';
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Text,
} from '@chakra-ui/react';
import { FunctionInput } from '@/features/Packages/FunctionInput';
import { FunctionOutput } from '@/features/Packages/FunctionOutput';
import { RefreshCw } from 'react-feather';
import {
  useAccount,
  useConnect,
  useNetwork,
  usePublicClient,
  useSwitchNetwork,
  useWalletClient,
} from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Address } from 'viem';
import { handleTxnError } from '@usecannon/builder';
import { ethers } from 'ethers'; // Remove after the builder is refactored to viem. (This is already a dependency via builder.)
import { CustomSpinner } from '@/components/CustomSpinner';
import { useContractCall, useContractTransaction } from '@/hooks/ethereum';

export const Function: FC<{
  f: AbiFunction;
  abi: Abi;
  address: string;
  cannonOutputs: ChainArtifacts;
  chainId: number;
}> = ({ f, abi, cannonOutputs, address, chainId }) => {
  const [loading, setLoading] = useState(false);
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

  // useEffect(() => {
  //   _.debounce(() => {
  //     if (readOnly && f.inputs.length === params.length) {
  //       void submit();
  //     }
  //   }, 200)();
  // }, [params, readOnly]);
  //
  useEffect(() => {
    if (readOnly && f.inputs.length === 0) {
      void submit(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (suppressError = false) => {
    setLoading(true);
    setError(null);
    try {
      if (readOnly) {
        await fetchReadContractResult();
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
        try {
          await fetchWriteContractResult();
        } catch (e) {
          console.error(e);
        }
      }
    } catch (e: any) {
      if (!suppressError) {
        console.error(e);
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

  return (
    <Box mb="6" pt="6" borderTop="1px solid rgba(255,255,255,0.15)">
      <Heading size="sm" mb="2">
        {f.name}()
      </Heading>
      {f.inputs.map((input, index) => {
        return (
          <Box key={JSON.stringify(input)}>
            <FormControl mb="4">
              <FormLabel color="white">
                {input.name && <Text display="inline">{input.name}</Text>}
                {input.type && (
                  <Text fontSize="xs" color="whiteAlpha.700" display="inline">
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
      {loading && (
        <Box my="4">
          <CustomSpinner />
        </Box>
      )}
      {error && (
        <Alert mb="4" status="error" bg="red.700" v-else-if="error">
          {error}
        </Alert>
      )}
      {((readOnly && readContractResult != null) ||
        (!readOnly && writeContractResult != null)) && (
        <Box>
          <FunctionOutput
            result={readOnly ? readContractResult : writeContractResult}
            output={f.outputs}
          />
        </Box>
      )}

      {/*{readOnly && (result != null || error) && (*/}
      {readOnly && (
        <Box
          display="inline-block"
          py={1}
          cursor="pointer"
          color="gray.400"
          _hover={{ color: 'gray.200' }}
          transition="color 0.2s ease-in-out"
        >
          <div onClick={() => submit(false)} className="refresh-button">
            <RefreshCw size={18} />
          </div>
        </Box>
      )}

      {!readOnly && (
        <Button
          isLoading={loading}
          colorScheme="teal"
          size="sm"
          onClick={() => {
            void submit(false);
          }}
        >
          Submit Transaction
        </Button>
      )}
    </Box>
  );
};
