import { CustomSpinner } from '@/components/CustomSpinner';
import { FunctionInput } from '@/features/Packages/FunctionInput';
import { FunctionOutput } from '@/features/Packages/FunctionOutput';
import { useQueueTxsStore, useStore } from '@/helpers/store';
import { useContractCall, useContractTransaction } from '@/hooks/ethereum';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AlertTriangleIcon,
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

export const Function: FC<{
  selected?: boolean;
  f: AbiFunction;
  abi: Abi;
  address: Address;
  cannonOutputs: ChainArtifacts;
  chainId: number;
  contractName?: string;
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
  contractName,
  contractSource,
  onDrawerOpen,
  collapsible,
  showFunctionSelector,
  packageUrl,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentSafe = useStore((s) => s.currentSafe);
  const { asPath: pathname } = useRouter();
  const [loading, setLoading] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [methodCallOrQueuedResult, setMethodCallOrQueuedResult] = useState<{
    value: unknown;
    error: string | null;
  } | null>(null);
  const [hasExpandedSelected, setHasExpandedSelected] = useState(false);

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
          : 'border border-border rounded-sm overflow-hidden'
      )}
    >
      <div className="max-w-container-xl">
        <div className="flex items-center">
          {showFunctionSelector && (
            <h2 className="text-sm font-mono flex items-center">
              {toFunctionSignature(f)}
              <Link
                className="text-gray-300 ml-1 hover:underline"
                href={anchor || '#'}
              >
                #
              </Link>
              {!!contractSource && (
                <Link
                  className="text-gray-300 ml-1 hover:underline"
                  href={getCodeUrl(f.name) || '#'}
                >
                  <FaCode className="text-gray-300" />
                </Link>
              )}
            </h2>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-8 h-full">
          <div className="flex-1 w-full md:w-1/2">
            {f.inputs.map((input, index) => {
              return (
                <div key={JSON.stringify(input)}>
                  <div className="mb-4">
                    <Label className="text-sm mb-1">
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
                </div>
              );
            })}

            {isFunctionPayable && (
              <div className="mb-4">
                <Label className="text-sm mb-1">
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

            {isFunctionReadOnly && (
              <Button
                disabled={loading}
                variant="outline"
                size="sm"
                className="mr-3"
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
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="mr-3"
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
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="mr-3 mb-3"
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
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="mr-3"
                  onClick={handleQueueTransaction}
                >
                  Stage to Safe
                </Button>
              </>
            )}

            {methodCallOrQueuedResult?.error && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>
                  {`${
                    methodCallOrQueuedResult.error.includes(
                      'Encoded error signature'
                    ) &&
                    methodCallOrQueuedResult.error.includes('not found on ABI')
                      ? 'Error emitted during ERC-7412 orchestration: '
                      : ''
                  }${methodCallOrQueuedResult.error}`}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="flex-1 w-full md:w-1/2 bg-accent/50 rounded-md p-4 flex flex-col relative overflow-x-scroll">
            <h3 className="text-sm uppercase mb-2 font-mono text-muted-foreground tracking-wider">
              Output
            </h3>

            {loading ? (
              <CustomSpinner />
            ) : (
              <div className="flex-1">
                {f.outputs.length != 0 && methodCallOrQueuedResult == null && (
                  <div className="absolute z-10 top-0 left-0 bg-black/70 w-full h-full flex items-center justify-center font-medium text-gray-300 text-shadow-sm tracking-wide">
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
      </div>
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
            className="flex flex-row px-3 py-2 items-center justify-between bg-background cursor-pointer hover:bg-accent/50 transition-colors"
            id={anchor}
            onClick={() => setIsOpen(!isOpen)}
          >
            {f.name && (
              <h2 className="text-sm font-mono flex items-center gap-2 max-w-full break-words">
                {toFunctionSignature(f)}
                <Link
                  className="text-gray-300 ml-1 hover:no-underline"
                  href={anchor}
                  onClick={(e) => e.stopPropagation()}
                >
                  #
                </Link>
                {!!contractSource && (
                  <Link
                    className="text-gray-300 ml-1 hover:no-underline"
                    href={getCodeUrl(f.name) ?? '#'}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FaCode className="text-gray-300" />
                  </Link>
                )}
              </h2>
            )}
            {isOpen ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </div>
          {isOpen && renderFunctionContent()}
        </div>
      ) : (
        renderFunctionContent()
      )}
    </>
  );
};
