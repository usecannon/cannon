import { CustomSpinner } from '@/components/CustomSpinner';
import { ContractMethodInputs } from '@/features/Packages/AbiMethod/AbiContractMethodInputs';
import { FunctionOutput } from '@/features/Packages/FunctionOutput';
import {
  useQueueTxsStore,
  useStore,
  useQueuedTransactions,
} from '@/helpers/store';
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
  ClockIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { Abi, AbiFunction, AbiParameter } from 'abitype';
import React, { FC, useState } from 'react';
import {
  Address,
  encodeFunctionData,
  parseEther,
  toFunctionSelector,
  TransactionRequestBase,
} from 'viem';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { AddressInput } from '@/features/Packages/AbiMethod/AddressInput';
import { links } from '@/constants/links';
import { NumberInput } from '@/features/Packages/AbiMethod/NumberInput';
import { useInitMethodParams } from '@/features/Packages/AbiMethod/utils';
import { useContractInteraction } from './useContractInteraction';
import { isPayable, isReadOnly } from '@/helpers/abi';
import { InputState } from '@/features/Packages/AbiMethod/utils';

const SimulateButton: React.FC<{
  chainId: number;
  isCallingMethod: boolean;
  hasParamsError: boolean;
  onSimulate: () => Promise<void>;
  isSimulation: boolean;
  methodCallOrQueuedResult: { error: string | null } | null;
  txHash?: `0x${string}`;
}> = ({
  isCallingMethod,
  hasParamsError,
  onSimulate,
  isSimulation,
  methodCallOrQueuedResult,
}) => {
  return (
    <Button
      disabled={isCallingMethod || hasParamsError}
      variant="outline"
      onClick={onSimulate}
      className="rounded-r-none border-r-0 w-full"
      data-testid="simulate-txs-button"
    >
      <PlayIcon className="w-4 h-4" />
      Simulate transaction
      {isSimulation && (isCallingMethod || methodCallOrQueuedResult) && (
        <StatusIcon
          isCallingMethod={isCallingMethod}
          error={Boolean(methodCallOrQueuedResult?.error)}
        />
      )}
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
  const [error, setError] = useState<string | undefined>(undefined);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          disabled={isCallingMethod || hasParamsError || Boolean(error)}
          variant="outline"
          className="rounded-l-none px-2 h-9 w-1/2 max-w-[55px]"
          size="sm"
        >
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <Label>Simulated Sender</Label>
        <div className="grid gap-4 mt-1">
          <AddressInput
            value={simulatedSender}
            handleUpdate={(value, error) => {
              if (error) {
                setError(error);
                return;
              }
              onSenderChange(value);
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
      {!isSimulation && (isCallingMethod || methodCallOrQueuedResult) && (
        <StatusIcon
          error={Boolean(methodCallOrQueuedResult?.error)}
          isCallingMethod={isCallingMethod}
        />
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

const StatusIcon = ({
  error,
  isCallingMethod,
}: {
  error: boolean;
  isCallingMethod: boolean;
}) => {
  if (isCallingMethod) {
    return <ClockIcon className="text-yellow-500" />;
  }

  return error ? (
    <AlertTriangleIcon className="text-red-700" />
  ) : (
    <CheckIcon className="text-green-500" />
  );
};

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

const CustomProviderAlert: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  return (
    <Alert variant="warning" className="mt-4">
      <div className="flex justify-between items-start">
        <AlertDescription>
          No custom provider specified. Please configure one on the{' '}
          <Link
            href="/settings"
            className="border-b border-dotted border-gray-300"
          >
            settings page.
          </Link>
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

export const AbiContractMethodInteraction: FC<{
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
  const isFunctionReadOnly = isReadOnly(f);
  const isFunctionPayable = isPayable(f);
  const currentSafe = useStore((s) => s.currentSafe);
  const { setQueuedIdentifiableTxns, setLastQueuedTxnsId } = useQueueTxsStore(
    (s) => s
  );
  const { queuedIdentifiableTxns, lastQueuedTxnsId } = useQueuedTransactions();

  // values and errors for the method inputs.
  const [params, setParams] = useInitMethodParams(f.inputs);
  const [paramsError, setParamsError] = useState<(string | undefined)[]>([]);
  // error when trying to stage the transaction.
  const [stageToSafeError, setStageToSafeError] = useState<string | undefined>(
    undefined
  );

  const [txValue, setTxValue] = useState<string | undefined>(undefined);
  const {
    isCallingMethod,
    isSimulation,
    callMethodResult,
    simulationSender,
    hasCustomProviderAlert,
    setSimulationSender,
    submit,
    clearResult,
    cleanCustomProviderAlert,
  } = useContractInteraction({
    f,
    abi,
    address,
    chainId,
    params: [...params],
    isFunctionReadOnly,
    value: parseEther(txValue || '0'),
  });

  const formatAbiParameterType = (input: AbiParameter): string => {
    const components = (
      input as AbiParameter & { components?: readonly AbiParameter[] }
    ).components;

    if (!components || !Array.isArray(components)) {
      return input.type;
    }

    const componentParts = components.map((comp: AbiParameter) => {
      if (comp.type.startsWith('tuple')) {
        const nestedFormatted = formatAbiParameterType(comp);
        return comp.name ? `${comp.name} ${nestedFormatted}` : nestedFormatted;
      }
      return comp.name ? `${comp.name} ${comp.type}` : comp.type;
    });

    const joinedComponents = componentParts.join(', ');

    if (input.type.endsWith('[]')) {
      return `(${joinedComponents})[]`;
    }
    return `(${joinedComponents})`;
  };

  const setParam = (index: number, newState: InputState) => {
    setParams((prevParams) => {
      const newParams = [...prevParams];
      newParams[index] = newState;
      return newParams;
    });
  };

  const handleQueueTransaction = () => {
    setStageToSafeError(undefined);

    if (!currentSafe) {
      toast.error('Please select a Safe first', {
        duration: 5000,
      });
      onDrawerOpen?.();
      return;
    }
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
        value: isFunctionPayable && txValue ? parseEther(txValue) : undefined,
      };
    } else {
      try {
        _txn = {
          to: address,
          data: encodeFunctionData({
            abi: [f],
            args: [...params],
          }),
          value: isFunctionPayable && txValue ? parseEther(txValue) : undefined,
        };
      } catch (err: any) {
        setStageToSafeError(err.message);
        clearResult();
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

  return (
    <div className={cn('px-3 py-2 bg-background', 'border-t border-border')}>
      <motion.div
        initial={{ y: -10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.2 }}
        className="max-w-container-xl"
      >
        <div className="flex flex-col md:flex-row gap-8 h-full py-2">
          {/* Inputs y botones */}
          <div className="flex flex-1 w-full lg:w-1/2 flex-col">
            {f.inputs.map((input, index) => (
              <div
                key={JSON.stringify(input) + index}
                className="mb-4 gap-1 flex flex-col"
              >
                <Label className="text-sm">
                  {input.name && <span>{input.name}</span>}
                  {input.type && (
                    <span className="text-xs text-muted-foreground font-mono ml-1">
                      {formatAbiParameterType(input)}
                    </span>
                  )}
                </Label>
                <ContractMethodInputs
                  methodParameter={input}
                  value={params[index]}
                  error={paramsError[index]}
                  handleUpdate={(newState, error) => {
                    setParamsError((prev) => {
                      const newErrors = [...prev];
                      newErrors[index] = error;
                      return newErrors;
                    });
                    setParam(index, newState);
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
                  fixedDecimals={18}
                  value={txValue}
                  suffix="ETH"
                />
              </div>
            )}

            {isFunctionReadOnly && (
              <div className="flex">
                <Button
                  disabled={
                    isCallingMethod || paramsError.some((p) => p !== undefined)
                  }
                  variant="outline"
                  size="sm"
                  onClick={async () => await submit()}
                  className="rounded-r-none border-r-0 h-9"
                  data-testid="call-function-button"
                >
                  <EyeIcon className="w-4 h-4" />
                  Call function
                </Button>
                <SimulateSenderPopover
                  isCallingMethod={isCallingMethod}
                  hasParamsError={paramsError.some((p) => p !== undefined)}
                  simulatedSender={simulationSender}
                  chainId={chainId}
                  onSenderChange={(value) => {
                    clearResult();
                    setSimulationSender(value as Address);
                  }}
                />
              </div>
            )}

            {!isFunctionReadOnly && (
              <div className="flex flex-col lg:flex-row gap-2">
                {/* Composite Simulate Button with Dropdown */}
                <div className="flex">
                  <SimulateButton
                    chainId={chainId}
                    isCallingMethod={isCallingMethod}
                    hasParamsError={paramsError.some((p) => p !== undefined)}
                    onSimulate={async () => submit({ simulate: true })}
                    isSimulation={isSimulation}
                    methodCallOrQueuedResult={callMethodResult}
                  />
                  <SimulateSenderPopover
                    isCallingMethod={isCallingMethod}
                    hasParamsError={paramsError.some((p) => p !== undefined)}
                    simulatedSender={simulationSender}
                    chainId={chainId}
                    onSenderChange={(value) => {
                      clearResult();
                      setSimulationSender(value as Address);
                    }}
                  />
                </div>
                <SubmitButton
                  isCallingMethod={isCallingMethod}
                  hasParamsError={paramsError.some((p) => p !== undefined)}
                  onSubmit={async () => await submit()}
                  isSimulation={isSimulation}
                  methodCallOrQueuedResult={callMethodResult}
                />
                <StageToSafeButton
                  isCallingMethod={isCallingMethod}
                  hasParamsError={paramsError.some((p) => p !== undefined)}
                  onStage={handleQueueTransaction}
                  functionName={f.name}
                />
              </div>
            )}

            {callMethodResult?.error && (
              <MethodCallAlertError
                error={callMethodResult.error}
                onClose={clearResult}
              />
            )}

            {hasCustomProviderAlert && (
              <CustomProviderAlert onClose={() => cleanCustomProviderAlert()} />
            )}

            {stageToSafeError && <InputErrorAlert error={stageToSafeError} />}
          </div>

          {/* Output */}
          <div className="flex-1 w-full md:w-1/2 bg-accent/25 rounded-md p-4 flex flex-col relative overflow-x-scroll">
            <h3 className="text-sm uppercase mb-2 font-mono text-muted-foreground tracking-wider">
              Output
            </h3>
            <div className="flex-1 flex flex-col gap-4">
              <AnimatePresence>
                {f.outputs.length !== 0 &&
                  (callMethodResult == null || isCallingMethod) && (
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
                  methodResult={callMethodResult?.value}
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
