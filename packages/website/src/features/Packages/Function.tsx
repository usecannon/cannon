import { CustomSpinner } from '@/components/CustomSpinner';
import { FunctionInput } from '@/features/Packages/FunctionInput';
import { FunctionOutput } from '@/features/Packages/FunctionOutput';
import { useQueueTxsStore, useStore } from '@/helpers/store';
import { useContractCall, useContractTransaction } from '@/hooks/ethereum';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import {
  CheckIcon,
  ChevronDownIcon,
  AlertTriangleIcon,
  PlayIcon,
  WalletIcon,
  EyeIcon,
  XIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { ChainArtifacts } from '@usecannon/builder';
import { Abi, AbiFunction } from 'abitype';
import React, { FC, useEffect, useRef, useState } from 'react';
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
import { AnimatePresence, motion } from 'framer-motion';

const extractError = (e: any): string => {
  return typeof e === 'string'
    ? e
    : e?.cause?.message || e?.message || e?.error?.message || e?.error || e;
};

const _isReadOnly = (abiFunction: AbiFunction) =>
  abiFunction.stateMutability === 'view' ||
  abiFunction.stateMutability === 'pure';

const _isPayable = (abiFunction: AbiFunction) =>
  abiFunction.stateMutability === 'payable';

const StatusIcon = ({ error }: { error: boolean }) => (
  <div className="inline-block ml-2">
    {error ? (
      <AlertTriangleIcon className="text-red-700" />
    ) : (
      <CheckIcon className="text-green-500" />
    )}
  </div>
);

interface FunctionProps {
  selected?: boolean;
  f: AbiFunction;
  abi: Abi;
  address: Address;
  cannonOutputs: ChainArtifacts;
  chainId: number;
  contractName?: string;
  onDrawerOpen?: () => void;
  collapsible?: boolean;
  showFunctionSelector: boolean;
  packageUrl?: string;
}

export const Function: FC<FunctionProps> = ({
  selected,
  f,
  abi,
  address,
  chainId,
  contractName,
  onDrawerOpen,
  collapsible,
  showFunctionSelector,
  packageUrl,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentSafe = useStore((s) => s.currentSafe);
  const [loading, setLoading] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [methodCallOrQueuedResult, setMethodCallOrQueuedResult] = useState<{
    value: unknown;
    error: string | null;
  } | null>(null);
  const [hasExpandedSelected, setHasExpandedSelected] = useState(false);
  const [showError, setShowError] = useState(true);

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
  const { toast } = useToast();

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

  const handleQueueTransaction = () => {
    if (!currentSafe) {
      toast({
        title: 'Please select a Safe first',
        variant: 'destructive',
        duration: 5000,
      });
      onDrawerOpen?.();
      return;
    }
    // Prevent queuing transactions across different chains
    if (currentSafe?.chainId !== chainId) {
      toast({
        title: `Cannot queue transactions across different chains, current Safe is on chain ${currentSafe?.chainId} and function is on chain ${chainId}`,
        variant: 'destructive',
        duration: 10000,
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
      duration: 5000,
    });
  };

  const renderFunctionContent = () => (
    <div
      className={cn(
        'px-3 py-2 bg-background',
        collapsible
          ? 'border-t border-border'
          : 'border border-border rounded-sm'
      )}
    >
      <motion.div
        initial={{ y: -10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.2 }}
        className="max-w-container-xl"
      >
        <div className="flex items-center">
          {showFunctionSelector && (
            <h2 className="text-sm font-mono flex items-center">
              {toFunctionSignature(f)}
              <Link
                className="text-muted-foreground ml-3 hover:no-underline"
                href={anchor || '#'}
              >
                #
              </Link>
            </h2>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-8 h-full py-2">
          <div className="flex flex-1 w-full lg:w-1/2 justify-center flex-col">
            {f.inputs.map((input, index) => {
              return (
                <div
                  key={JSON.stringify(input)}
                  className="mb-4 gap-1 flex flex-col"
                >
                  <Label className="text-sm">
                    {input.name && <span>{input.name}</span>}
                    {input.type && (
                      <span className="text-xs text-muted-foreground font-mono ml-1">
                        {input.type}
                      </span>
                    )}
                  </Label>
                  <FunctionInput
                    input={input}
                    handleUpdate={(value) => {
                      setParam(index, value);
                    }}
                  />
                </div>
              );
            })}

            {isFunctionPayable && (
              <div className="mb-4 gap-1 flex flex-col">
                <Label className="text-sm">
                  Value
                  <span className="text-xs text-muted-foreground ml-1">
                    (payable)
                  </span>
                </Label>
                <div className="flex">
                  <Input
                    type="number"
                    className={cn(
                      'bg-background border-border',
                      !valueIsValid && 'border-red-500'
                    )}
                    value={value?.toString() ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setValue(val === '' ? 0 : Number(val));
                      try {
                        parseEther(val === '' ? '0' : val);
                        setValueIsValid(true);
                      } catch (err) {
                        setValueIsValid(false);
                      }
                    }}
                  />
                  <div className="flex items-center px-3 py-1 bg-background text-gray-300 border border-l-0 border-border rounded-r-md">
                    ETH
                  </div>
                </div>
                {valueIsValid && value !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {parseEther(value.toString()).toString()} wei
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-4 mt-1">
              {isFunctionReadOnly && (
                <Button
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void submit();
                  }}
                >
                  <EyeIcon className="w-4 h-4" />
                  Call view function
                </Button>
              )}

              {!isFunctionReadOnly && (
                <div className="flex w-full justify-between gap-4">
                  <Button
                    disabled={loading}
                    variant="outline"
                    onClick={async () => await submit({ simulate: true })}
                  >
                    <PlayIcon className="w-4 h-4" />
                    Simulate transaction{' '}
                    {simulated && methodCallOrQueuedResult && (
                      <StatusIcon
                        error={Boolean(methodCallOrQueuedResult.error)}
                      />
                    )}
                  </Button>
                  <Button
                    disabled={loading}
                    variant="outline"
                    onClick={async () => await submit()}
                  >
                    <WalletIcon className="w-4 h-4" />
                    Submit with wallet{' '}
                    {!simulated && methodCallOrQueuedResult && (
                      <StatusIcon
                        error={Boolean(methodCallOrQueuedResult.error)}
                      />
                    )}
                  </Button>
                  <Button
                    id={`${f.name}-stage-to-safe`}
                    disabled={loading}
                    variant="outline"
                    onClick={handleQueueTransaction}
                  >
                    <svg
                      width="2px"
                      height="2px"
                      viewBox="0 0 39 40"
                      fill="none"
                    >
                      <path
                        d="M2.22855 19.5869H6.35167C7.58312 19.5869 8.58087 20.6155 8.58087 21.8847V28.0535C8.58087 29.3227 9.57873 30.3513 10.8101 30.3513H27.2131C28.4445 30.3513 29.4424 31.3798 29.4424 32.6492V36.8993C29.4424 38.1685 28.4445 39.1971 27.2131 39.1971H9.86067C8.62922 39.1971 7.6457 38.1685 7.6457 36.8993V33.4893C7.6457 32.2201 6.64783 31.3196 5.41638 31.3196H2.22938C0.99805 31.3196 0.000190262 30.2911 0.000190262 29.0217V21.8581C0.000190262 20.5888 0.997223 19.5869 2.22855 19.5869Z"
                        fill="white"
                      />
                      <path
                        d="M29.4429 11.1437C29.4429 9.87434 28.4451 8.84578 27.2136 8.84578H10.8207C9.58924 8.84578 8.5915 7.81722 8.5915 6.54797V2.29787C8.5915 1.02853 9.58924 0 10.8207 0H28.164C29.3953 0 30.3932 1.02853 30.3932 2.29787V5.57274C30.3932 6.84199 31.3909 7.87055 32.6224 7.87055H35.7952C37.0266 7.87055 38.0244 8.89911 38.0244 10.1685V17.3398C38.0244 18.6092 37.0224 19.5861 35.791 19.5861H31.668C30.4365 19.5861 29.4387 18.5576 29.4387 17.2883L29.4429 11.1437Z"
                        fill="white"
                      />
                      <path
                        d="M20.9524 15.1196H16.992C15.7013 15.1196 14.6543 16.1997 14.6543 17.5293V21.6117C14.6543 22.942 15.7021 24.0212 16.992 24.0212H20.9524C22.243 24.0212 23.29 22.9411 23.29 21.6117V17.5293C23.29 16.1989 22.2422 15.1196 20.9524 15.1196Z"
                        fill="white"
                      />
                    </svg>
                    Stage to Safe
                  </Button>
                </div>
              )}
            </div>

            {methodCallOrQueuedResult?.error && showError && (
              <Alert variant="destructive" className="mt-4">
                <div className="flex justify-between items-start">
                  <AlertDescription className="flex-1">
                    {`${
                      methodCallOrQueuedResult.error.includes(
                        'Encoded error signature'
                      ) &&
                      methodCallOrQueuedResult.error.includes(
                        'not found on ABI'
                      )
                        ? 'Error emitted during ERC-7412 orchestration: '
                        : ''
                    }${methodCallOrQueuedResult.error}`}
                  </AlertDescription>
                  <button
                    onClick={() => setShowError(false)}
                    className="ml-2 hover:opacity-70"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </Alert>
            )}
          </div>
          <div className="flex-1 w-full md:w-1/2 bg-accent/25 rounded-md p-4 flex flex-col relative overflow-x-scroll">
            <h3 className="text-sm uppercase mb-2 font-mono text-muted-foreground tracking-wider">
              Output
            </h3>

            {loading ? (
              <CustomSpinner />
            ) : (
              <div className="flex-1">
                {f.outputs.length != 0 && methodCallOrQueuedResult == null && (
                  <div className="absolute z-10 top-0 left-0 bg-background/75 w-full h-full flex items-center justify-center text-muted-foreground">
                    {isFunctionReadOnly
                      ? 'Call the view function '
                      : 'Simulate the transaction '}
                    for output
                  </div>
                )}
                <FunctionOutput
                  methodResult={methodCallOrQueuedResult?.value || null}
                  abiParameters={f.outputs}
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );

  useEffect(() => {
    if (!hasExpandedSelected && selected && !isOpen) {
      setIsOpen(true);
      setHasExpandedSelected(true);
    }
  }, [selected, isOpen, hasExpandedSelected]);

  return (
    <>
      {collapsible ? (
        <div className="flex flex-col border border-border rounded-sm overflow-hidden">
          <div
            className="flex flex-row px-3 py-2 items-center justify-between hover:bg-accent/60 cursor-pointer bg-accent/50 transition-colors"
            id={anchor}
            onClick={() => setIsOpen(!isOpen)}
          >
            {f.name && (
              <h2 className="text-sm font-mono flex items-center max-w-full break-words">
                {toFunctionSignature(f)}
                <Link
                  className="text-muted-foreground ml-3 hover:no-underline"
                  href={anchor}
                  onClick={(e) => e.stopPropagation()}
                >
                  #
                </Link>
              </h2>
            )}
            <ChevronDownIcon
              className={cn(
                'w-5 h-5 transition-transform duration-300',
                isOpen && 'rotate-180'
              )}
            />
          </div>
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                key="content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                {renderFunctionContent()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        renderFunctionContent()
      )}
    </>
  );
};
