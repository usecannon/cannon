import { CustomSpinner } from '@/components/CustomSpinner';
import { AbiMethodRender } from '@/features/Packages/AbiMethod/AbiMethodRender';
import { FunctionOutput } from '@/features/Packages/FunctionOutput';
import {
  useQueueTxsStore,
  useStore,
  useQueuedTransactions,
} from '@/helpers/store';
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
  EditIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Abi, AbiFunction } from 'abitype';
import React, { FC, useEffect, useState } from 'react';
import {
  Address,
  createPublicClient,
  encodeFunctionData,
  parseEther,
  toFunctionSelector,
  TransactionRequestBase,
  zeroAddress,
  isAddress,
} from 'viem';
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { AddressInput } from '@/features/Packages/AbiMethod/AddressInput';
import { links } from '@/constants/links';
import isEqual from 'lodash/isEqual';
import { NumberInput } from '@/features/Packages/AbiMethod/NumberInput';

// Internal button components
const SimulateButton: React.FC<{
  isCallingMethod: boolean;
  hasParamsError: boolean;
  onSimulate: () => Promise<void>;
}> = ({ isCallingMethod, hasParamsError, onSimulate }) => {
  return (
    <Button
      disabled={isCallingMethod || hasParamsError}
      variant="outline"
      onClick={onSimulate}
      className="rounded-r-none border-r-0"
      data-testid="simulate-txs-button"
    >
      <PlayIcon className="w-4 h-4" />
      Simulate transaction
    </Button>
  );
};

interface SimulateSenderPopoverProps {
  isCallingMethod: boolean;
  hasParamsError: boolean;
  simulatedSender: Address;
  chainId: number;
  onSenderChange: (value: string) => void;
}

const SimulateSenderPopover: React.FC<SimulateSenderPopoverProps> = ({
  isCallingMethod,
  hasParamsError,
  simulatedSender,
  chainId,
  onSenderChange,
}) => {
  const { getChainById } = useCannonChains();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          disabled={isCallingMethod || hasParamsError}
          variant="outline"
          className="rounded-l-none px-2"
        >
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <Label>Simulated Sender</Label>
        <div className="grid gap-4 mt-1">
          <AddressInput
            value={simulatedSender}
            handleUpdate={(value) => {
              if (isAddress(value)) {
                onSenderChange(value);
              }
            }}
          />
          <p className="text-sm text-muted-foreground">
            Using{' '}
            {(() => {
              const rpcUrl = getChainById(chainId)?.rpcUrls?.default?.http[0];
              if (!rpcUrl) return 'default RPC URL';
              const match = rpcUrl.match(/https?:\/\/([^/]+)/);
              return match ? match[1] : rpcUrl;
            })()}{' '}
            <Link
              href={links.SETTINGS}
              className="inline-block align-text-bottom text-white hover:opacity-70 ml-0.5"
            >
              <EditIcon className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const SubmitButton: React.FC<{
  isCallingMethod: boolean;
  hasParamsError: boolean;
  onSubmit: () => Promise<void>;
  isSimulation: boolean;
  methodCallOrQueuedResult: { error: string | null } | null;
}> = ({
  isCallingMethod,
  hasParamsError,
  onSubmit,
  isSimulation,
  methodCallOrQueuedResult,
}) => {
  return (
    <Button
      disabled={isCallingMethod || hasParamsError}
      variant="outline"
      onClick={onSubmit}
      data-testid="submit-wallet-button"
    >
      <WalletIcon className="w-4 h-4" />
      Submit with wallet{' '}
      {!isSimulation && methodCallOrQueuedResult && (
        <StatusIcon error={Boolean(methodCallOrQueuedResult.error)} />
      )}
    </Button>
  );
};

const StageToSafeButton: React.FC<{
  isCallingMethod: boolean;
  hasParamsError: boolean;
  onStage: () => void;
  functionName: string;
}> = ({ isCallingMethod, hasParamsError, onStage, functionName }) => {
  return (
    <Button
      id={`${functionName}-stage-to-safe`}
      disabled={isCallingMethod || hasParamsError}
      variant="outline"
      onClick={onStage}
      data-testid="stage-safe-button"
    >
      <svg width="2px" height="2px" viewBox="0 0 39 40" fill="none">
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
  );
};

const StatusIcon = ({ error }: { error: boolean }) => (
  <div className="inline-block ml-2">
    {error ? (
      <AlertTriangleIcon className="text-red-700" />
    ) : (
      <CheckIcon className="text-green-500" />
    )}
  </div>
);

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

const MethodCallAlertError: React.FC<{
  error: string;
  onClose: () => void;
}> = ({ error, onClose }) => {
  return (
    <Alert variant="destructive" className="mt-4">
      <div className="flex justify-between items-start">
        <AlertDescription className="flex-1 overflow-x-auto">
          <div className="whitespace-nowrap">
            {`${
              error.includes('Encoded error signature') &&
              error.includes('not found on ABI')
                ? 'Error emitted during ERC-7412 orchestration: '
                : ''
            }${error}`}
          </div>
        </AlertDescription>
        <button
          onClick={onClose}
          className="ml-2 hover:opacity-70 flex-shrink-0"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </Alert>
  );
};

const InputErrorAlert: React.FC<{
  error: string;
}> = ({ error }) => (
  <Alert variant="destructive" className="mt-1">
    <AlertDescription>{error}</AlertDescription>
  </Alert>
);

export const AbiMethodRenderContent: FC<{
  f: AbiFunction;
  abi: Abi;
  address: Address;
  chainId: number;
  contractName?: string;
  onDrawerOpen?: () => void;
  packageUrl?: string;
  isDrawerOpen?: boolean;
}> = ({
  f,
  abi,
  address,
  chainId,
  contractName,
  onDrawerOpen,
  packageUrl,
  isDrawerOpen,
}) => {
  const { getChainById, transports } = useCannonChains();
  const chain = getChainById(chainId);
  const { isConnected, address: from, chain: connectedChain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { data: walletClient } = useWalletClient({
    chainId: chainId as number,
  })!;
  const publicClient = createPublicClient({
    chain,
    transport: transports[chainId],
  });

  const [params, setParams] = useState<any[] | any>([]);
  const [paramsError, setParamsError] = useState<(string | undefined)[]>([]);
  const [simulatedSender, setSimulatedSender] = useState<Address>(zeroAddress);
  const [isSimulation, setIsSimulation] = useState(false);
  const hasParamsError = paramsError.some((error) => error !== undefined);
  const [isCallingMethod, setIsCallingMethod] = useState(false);
  const [txValue, setTxValue] = useState<any>();
  const [methodCallOrQueuedResult, setMethodCallOrQueuedResult] = useState<{
    value: unknown;
    error: string | null;
  } | null>(null);
  const isFunctionReadOnly = _isReadOnly(f);
  const isFunctionPayable = _isPayable(f);

  const currentSafe = useStore((s) => s.currentSafe);
  const { setQueuedIdentifiableTxns, setLastQueuedTxnsId } = useQueueTxsStore(
    (s) => s
  );
  const { queuedIdentifiableTxns, lastQueuedTxnsId } = useQueuedTransactions();

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

  const setParam = (index: number, value: any, error?: string) => {
    if (isEqual(params[index], value)) {
      return;
    }

    setParams((prevParams: any[]) => {
      const newParams = [...prevParams];
      newParams[index] = value;
      return newParams;
    });

    setParamsError((prevErrors) => {
      const newErrors = [...(prevErrors || [])];
      newErrors[index] = error;
      return newErrors;
    });
  };

  const submit = async ({ simulate = false }: { simulate?: boolean } = {}) => {
    setIsCallingMethod(true);
    setMethodCallOrQueuedResult(null);
    setIsSimulation(simulate);

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

  const handleReadFunction = async () => {
    const result = await fetchReadContractResult(
      isSimulation ? simulatedSender : from ?? zeroAddress
    );
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

    const result = await fetchWriteContractResult();
    if (result.error) {
      setMethodCallOrQueuedResult({
        value: null,
        error: extractError(result.error),
      });
    } else {
      setMethodCallOrQueuedResult({ value: result.value, error: null });
    }
  };

  const handleQueueTransaction = () => {
    if (!currentSafe) {
      toast.error('Please select a Safe first', {
        duration: 5000,
      });
      onDrawerOpen?.();
      return;
    }
    // Prevent queuing transactions across different chains
    if (currentSafe?.chainId !== chainId) {
      toast.error(
        `Cannot queue transactions across different chains, current Safe is on chain ${currentSafe?.chainId} and function is on chain ${chainId}`,
        {
          duration: 10000,
        }
      );
      onDrawerOpen?.();
      return;
    }

    let _txn: Omit<TransactionRequestBase, 'from'> | null = null;

    if (f.inputs.length === 0) {
      _txn = {
        to: address,
        data: toFunctionSelector(f),
        value:
          isFunctionPayable && txValue !== undefined
            ? parseEther(txValue.toString())
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
            isFunctionPayable && txValue !== undefined
              ? parseEther(txValue.toString())
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

    const safeSidebarContext = isDrawerOpen
      ? 'Transaction added to the queue.'
      : 'Click the Safe icon on the right side of the screen to see the staged transactions.';

    toast.success(safeSidebarContext, {
      duration: 5000,
    });
  };

  // set wallet address as "from" for simulations
  useEffect(() => {
    if (from) {
      setSimulatedSender(from);
    }
  }, [from]);

  return (
    <div className={cn('px-3 py-2 bg-background', 'border-t border-border')}>
      <motion.div
        initial={{ y: -10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.2 }}
        className="max-w-container-xl"
      >
        <div className="flex flex-col md:flex-row gap-8 h-full py-2">
          {/* Inputs */}
          <div className="flex flex-1 w-full lg:w-1/2 flex-col">
            {f.inputs.map((input, index) => (
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
                <AbiMethodRender
                  input={input}
                  initialValue={params[index]}
                  handleUpdate={(value, error) => {
                    setParam(index, value, error);
                  }}
                />
                {paramsError[index] && (
                  <InputErrorAlert error={paramsError[index]} />
                )}
              </div>
            ))}

            {isFunctionPayable && (
              <div className="mb-4 gap-1 flex flex-col">
                <Label className="text-sm">
                  Value
                  <span className="text-xs text-muted-foreground ml-1">
                    (payable)
                  </span>
                </Label>
                <NumberInput
                  handleUpdate={setTxValue}
                  value={txValue?.toString() ?? ''}
                  suffix="ETH"
                  showWeiValue
                />
              </div>
            )}

            <div className="flex gap-4 mt-1">
              {isFunctionReadOnly && (
                <div className="flex">
                  <Button
                    disabled={isCallingMethod || hasParamsError}
                    variant="outline"
                    size="sm"
                    onClick={async () => await submit()}
                    className="rounded-r-none border-r-0"
                    data-testid="call-function-button"
                  >
                    <EyeIcon className="w-4 h-4" />
                    Call function
                  </Button>
                  <SimulateSenderPopover
                    isCallingMethod={isCallingMethod}
                    hasParamsError={hasParamsError}
                    simulatedSender={simulatedSender}
                    chainId={chainId}
                    onSenderChange={(value) => {
                      setMethodCallOrQueuedResult(null);
                      setSimulatedSender(value as Address);
                    }}
                  />
                </div>
              )}

              {!isFunctionReadOnly && (
                <div className="flex w-full justify-between gap-4">
                  <div className="flex">
                    <SimulateButton
                      isCallingMethod={isCallingMethod}
                      hasParamsError={hasParamsError}
                      onSimulate={async () => await submit({ simulate: true })}
                    />
                    <SimulateSenderPopover
                      isCallingMethod={isCallingMethod}
                      hasParamsError={hasParamsError}
                      simulatedSender={simulatedSender}
                      chainId={chainId}
                      onSenderChange={(value) => {
                        setMethodCallOrQueuedResult(null);
                        setSimulatedSender(value as Address);
                      }}
                    />
                    <SubmitButton
                      isCallingMethod={isCallingMethod}
                      hasParamsError={hasParamsError}
                      onSubmit={async () => await submit()}
                      isSimulation={isSimulation}
                      methodCallOrQueuedResult={methodCallOrQueuedResult}
                    />
                    <StageToSafeButton
                      isCallingMethod={isCallingMethod}
                      hasParamsError={hasParamsError}
                      onStage={handleQueueTransaction}
                      functionName={f.name}
                    />
                  </div>
                </div>
              )}
            </div>

            {methodCallOrQueuedResult?.error && (
              <MethodCallAlertError
                error={methodCallOrQueuedResult.error}
                onClose={() => setMethodCallOrQueuedResult(null)}
              />
            )}
          </div>

          {/* Output */}
          <div className="flex-1 w-full md:w-1/2 bg-accent/25 rounded-md p-4 flex flex-col relative overflow-x-scroll">
            <h3 className="text-sm uppercase mb-2 font-mono text-muted-foreground tracking-wider">
              Output
            </h3>
            <div className="flex-1 flex flex-col gap-4">
              <AnimatePresence>
                {f.outputs.length !== 0 &&
                  (methodCallOrQueuedResult == null || isCallingMethod) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute z-10 top-0 left-0 bg-background/100 w-full h-full flex items-center justify-center text-muted-foreground"
                    >
                      {isCallingMethod ? (
                        <CustomSpinner className="h-8 w-8" />
                      ) : (
                        <>
                          {isFunctionReadOnly
                            ? 'Call the view function for output'
                            : 'Simulate the transaction for output'}
                        </>
                      )}
                    </motion.div>
                  )}
              </AnimatePresence>

              {f.outputs.length !== 0 && (
                <FunctionOutput
                  chainId={chainId}
                  methodResult={methodCallOrQueuedResult?.value}
                  abiParameters={f.outputs}
                />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
