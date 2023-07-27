import React, { FC, useEffect, useMemo, useState } from 'react';
import { AbiFunction } from 'abitype/src/abi';
import { ChainArtifacts } from '@usecannon/builder';
import _ from 'lodash';
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { FunctionInput } from '@/features/Packages/FunctionInput';
import { FunctionOutput } from '@/features/Packages/FunctionOutput';
import { RefreshCw } from 'react-feather';
import { useAccount, useNetwork } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Address, createPublicClient, getContract, http } from 'viem';

export const Function: FC<{
  f: AbiFunction;
  address: string;
  cannonOutputs: ChainArtifacts;
  chainId?: number;
}> = ({ f, address, cannonOutputs, chainId }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [params, setParams] = useState<any[]>([]);
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const network = useNetwork();

  const readOnly = useMemo(
    () => f.stateMutability == 'view' || f.stateMutability == 'pure',
    [f.stateMutability]
  );

  useEffect(() => {
    _.debounce(() => {
      if (readOnly) {
        void submit();
      }
    }, 200)();
  }, [params, readOnly]);

  useEffect(() => {
    if (readOnly && params.length == 0) {
      void submit(true);
    }
  }, []);

  const submit = async (suppressError = false) => {
    setLoading(true);
    // TODO: implement
    // console.log('isConnected:', isConnected);
    try {
      if (readOnly) {
        const chain = network.chains.find((c) => c.id == chainId);
        console.log('chain:', chain);
        const publicClient = createPublicClient({
          transport: http(),
          chain: chain,
        });
        const _contract = getContract({
          address: address as Address,
          abi: [f],
          publicClient,
        });
        console.log('contract.read', _contract.read);
        const _result = await _contract.read[f.name](...params);
        console.log('_result:', _result);
        setResult(_result);
      } else {
        if (!isConnected) {
          if (openConnectModal) openConnectModal();
          return;
        }
      }
    } catch (e) {
      if (!suppressError) {
        try {
          // await handleTxnError(this.cannonOutputs, provider, e) // TODO
          console.error(e);
        } catch (e2) {
          setError(e2);
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
      {f.inputs.map((input) => {
        return (
          <Box key={JSON.stringify(input)}>
            <FormControl mb="4">
              <FormLabel color="white">
                {input.name && <Text display="inline">{input.name}</Text>}
                {input.type && (
                  <Text fontSize="xs" color="whiteAlpha.700" display="inline">
                    {input.type}
                  </Text>
                )}
              </FormLabel>
              <FunctionInput input={input} valueUpdated={setParams} />
            </FormControl>
          </Box>
        );
      })}
      {loading && (
        <Box my="4">
          <Spinner />
        </Box>
      )}
      {error && (
        <Alert mb="4" status="error" bg="red.700" v-else-if="error">
          {error}
        </Alert>
      )}
      {result != null && (
        <Box>
          <FunctionOutput result={result} output={f.outputs} />
        </Box>
      )}

      {readOnly && (result != null || error) && (
        <Box display="inline" v-if="readOnly && (result != null || error)">
          <div onClick={() => submit(false)} className="refresh-button">
            <RefreshCw />
          </div>
        </Box>
      )}

      {!readOnly && (
        <Button
          isLoading={loading}
          variant-color="teal"
          bg="teal.600"
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
