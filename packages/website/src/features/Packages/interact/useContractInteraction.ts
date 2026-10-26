import { useContractCall, useContractTransaction } from '@/hooks/ethereum';
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Abi, AbiFunction } from 'abitype';
import { Address, createPublicClient, zeroAddress } from 'viem';
import { useState, useEffect } from 'react';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { useStore } from '@/helpers/store';

interface ContractCallResult {
  value: unknown;
  error: string | null;
}

// Utility functions
const extractError = (e: unknown): string => {
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    return (e as any)?.cause?.message || (e as any)?.message || (e as any)?.error?.message || (e as any)?.error || String(e);
  }
  return String(e);
};

const useSimulation = () => {
  const { address } = useAccount();

  const [simulationSender, setSimulationSender] = useState<Address>(zeroAddress);

  useEffect(() => {
    if (address) {
      setSimulationSender(address);
    }
  }, [address]);

  return { simulationSender, setSimulationSender };
};
interface UseContractInteractionProps {
  f: AbiFunction;
  abi: Abi;
  address: Address;
  chainId: number;
  params: any[];
  value: bigint;
  isFunctionReadOnly: boolean;
}

export const useContractInteraction = ({
  f,
  abi,
  address,
  chainId,
  params,
  value,
  isFunctionReadOnly,
}: UseContractInteractionProps) => {
  // Wallet and chain state
  const { isConnected, address: from, chain: connectedChain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { data: walletClient } = useWalletClient({
    chainId,
  })!;

  const { getChainById, transports } = useCannonChains();
  const chain = getChainById(chainId);
  const publicClient = createPublicClient({
    chain,
    transport: transports[chainId],
  });
  if (!publicClient) throw new Error('Public client not found');

  // Local state
  const [isCallingMethod, setIsCallingMethod] = useState(false);
  const [isSimulation, setIsSimulation] = useState(false);
  const [callMethodResult, setCallMethodResult] = useState<ContractCallResult | null>(null);
  const [hasCustomProviderAlert, setHasCustomProviderAlert] = useState<boolean>(false);
  const customProviders = useStore((s) => s.settings.customProviders);
  const hasNoCustomProviderSetting = customProviders.length === 0;

  // Simulation state
  const { simulationSender, setSimulationSender } = useSimulation();

  // Contract interaction hooks
  const fetchReadContractResult = useContractCall(address, f.name, [...params], value, abi, publicClient);
  const fetchWriteContractResult = useContractTransaction(
    from as Address,
    address as Address,
    value,
    f.name,
    [...params],
    abi,
    publicClient,
    walletClient as any,
  );

  // Handlers
  const handleReadFunction = async () => {
    const result = await fetchReadContractResult(isSimulation ? simulationSender : (from ?? zeroAddress));
    if (result.error) {
      setCallMethodResult({
        value: null,
        error: extractError(result.error),
      });
      setHasCustomProviderAlert(hasNoCustomProviderSetting);
    } else {
      setCallMethodResult({ value: result.value, error: null });
      setHasCustomProviderAlert(false);
    }
  };

  const handleWriteFunction = async (simulate: boolean) => {
    if (simulate) {
      await handleReadFunction();
      return;
    }

    if (!isConnected) {
      if (openConnectModal) openConnectModal();
      return;
    }

    if (connectedChain?.id !== chainId) {
      await switchChain({ chainId: chainId });
    }

    try {
      const result = await fetchWriteContractResult();

      if (result.error) {
        setCallMethodResult({
          value: null,
          error: extractError(result.error),
        });
        setHasCustomProviderAlert(hasNoCustomProviderSetting);
        return;
      }

      await publicClient
        .waitForTransactionReceipt({
          hash: result.value,
        })
        .then((r) => {
          if (r.status === 'success') {
            setCallMethodResult({ value: result.value, error: null });
            setHasCustomProviderAlert(false);
          } else {
            setCallMethodResult({
              value: null,
              error: 'Transaction failed',
            });
            setHasCustomProviderAlert(hasNoCustomProviderSetting);
          }
        });
    } catch (error) {
      setCallMethodResult({
        value: null,
        error: extractError(error),
      });
      setHasCustomProviderAlert(hasNoCustomProviderSetting);
    }
  };

  // Public methods
  const submit = async ({ simulate = false }: { simulate?: boolean } = {}) => {
    setIsCallingMethod(true);
    setCallMethodResult(null);
    setIsSimulation(simulate);
    setHasCustomProviderAlert(false);

    try {
      if (isFunctionReadOnly || simulate) {
        await handleReadFunction();
      } else {
        await handleWriteFunction(simulate);
      }
    } finally {
      setIsCallingMethod(false);
    }
  };

  const clearResult = () => {
    setCallMethodResult(null);
  };

  const cleanCustomProviderAlert = () => {
    setHasCustomProviderAlert(false);
  };

  return {
    isCallingMethod,
    isSimulation,
    callMethodResult,
    simulationSender,
    hasCustomProviderAlert,
    setSimulationSender,
    submit,
    clearResult,
    cleanCustomProviderAlert,
  };
};
