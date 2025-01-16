import { isValidHex } from '@/helpers/ethereum';
import { useStore } from '@/helpers/store';
import { useCannonPackage, useCannonPackageContracts } from '@/hooks/cannon';
import { useSimulatedTxns } from '@/hooks/fork';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AbiFunction } from 'abitype';
import { useEffect, useState } from 'react';
import * as viem from 'viem';
import { FunctionInput } from '../Packages/FunctionInput';
import 'react-diff-view/style/index.css';

function decodeError(err: viem.Hex, abi: viem.Abi) {
  try {
    const parsedError = viem.decodeErrorResult({
      abi,
      data: err,
    });

    return `${parsedError.errorName}(${parsedError.args?.join(', ') || ''})`;
  } catch (err) {
    // ignore
  }

  return 'unknown error';
}

export function QueueTransaction({
  onChange,
  isDeletable,
  onDelete,
  txn: tx,
  fn,
  params,
  contractName,
  contractAddress,
  target,
  chainId,
  isCustom,
  simulate = true,
}: {
  onChange: (
    txn: Omit<viem.TransactionRequestBase, 'from'> | null,
    fn: AbiFunction,
    params: any[] | any,
    contractName: string | null,
    target?: string,
    chainId?: number
  ) => void;
  isCustom?: boolean;
  isDeletable: boolean;
  onDelete: () => void;
  txn: Omit<viem.TransactionRequestBase, 'from'> | null;
  fn?: AbiFunction;
  contractName?: string;
  contractAddress?: string;
  params?: any[] | any;
  target: string;
  chainId: number;
  simulate?: boolean;
}) {
  const [value, setValue] = useState<string | undefined>(
    tx?.value ? viem.formatEther(BigInt(tx?.value)).toString() : undefined
  );
  const [valueIsValid, setValueIsValid] = useState<boolean>(true);
  const pkg = useCannonPackage(target, chainId);
  const { contracts } = useCannonPackageContracts(target, chainId);

  const [selectedContractName, setSelectedContractName] = useState<
    string | null
  >(contractName || null);
  const [selectedFunction, setSelectedFunction] = useState<AbiFunction | null>(
    fn || null
  );
  const [selectedParams, setSelectedParams] = useState<any[]>(params || []);
  const [txn, setTxn] = useState<Omit<
    viem.TransactionRequestBase,
    'from'
  > | null>(tx || null);
  const [paramsEncodeError, setParamsEncodeError] = useState<string | null>();

  useEffect(() => {
    if (!selectedContractName) {
      setSelectedFunction(null);
      setSelectedParams([]);
    }
  }, [selectedContractName]);

  useEffect(() => {
    if (!selectedContractName) {
      setSelectedParams([]);
    }
  }, [selectedFunction]);

  useEffect(() => {
    if (isCustom) return;

    let error: string | null = null;
    let _txn: Omit<viem.TransactionRequestBase, 'from'> | null = null;

    if (selectedContractName && selectedFunction) {
      const isPayable = selectedFunction.stateMutability === 'payable';

      if (selectedFunction.inputs.length === 0) {
        _txn = {
          to: contracts
            ? contracts[selectedContractName].address
            : (tx?.to as viem.Address),
          data: viem.toFunctionSelector(selectedFunction),
          value:
            isPayable && value !== undefined
              ? viem.parseEther(value.toString())
              : undefined,
        };
      } else {
        try {
          _txn = {
            to: contracts
              ? contracts[selectedContractName].address
              : (tx?.to as viem.Address),
            data: viem.encodeFunctionData({
              abi: [selectedFunction],
              args: selectedParams,
            }),
            value:
              isPayable && value !== undefined
                ? viem.parseEther(value.toString())
                : undefined,
          };
        } catch (err: any) {
          error =
            typeof err === 'string'
              ? err
              : err?.message || err?.error?.message || err?.error || err;
        }
      }
    }

    setParamsEncodeError(error);
    setTxn(_txn);
    onChange(
      _txn,
      selectedFunction as any,
      selectedParams,
      selectedContractName
    );
  }, [
    value,
    selectedContractName,
    selectedFunction,
    selectedParams,
    contractAddress,
    txn?.to,
  ]);

  const currentSafe = useStore((s) => s.currentSafe);
  const txnInfo = useSimulatedTxns(
    currentSafe as any,
    txn && simulate ? [txn] : []
  );

  if (isCustom) {
    const isValid = isValidHex(tx?.data || '');
    return (
      <div className="flex flex-col">
        <div className="flex flex-row items-center justify-between bg-muted p-3 px-6">
          <span className="text-sm font-semibold text-muted-foreground">
            Contract Address: {tx?.to}
          </span>
          {isDeletable && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onDelete}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove transaction</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center">
          <div className="flex flex-1 w-full md:w-1/2 flex-col gap-2.5 p-6 pt-4 pb-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                value={tx?.data}
                onChange={(e) =>
                  onChange(
                    {
                      ...tx,
                      data: e.target.value as any,
                    },
                    selectedFunction as any,
                    selectedParams,
                    selectedContractName
                  )
                }
              />
              {!isValid && (
                <p className="text-sm text-destructive">
                  Invalid transaction data
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Data field for custom transaction
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-row items-center justify-between bg-muted p-3 px-6">
        {pkg?.fullPackageRef ? (
          <span className="text-sm font-semibold text-muted-foreground">
            {pkg?.fullPackageRef}
          </span>
        ) : (
          <i className="text-sm text-muted-foreground">
            Loading package data...
          </i>
        )}
        {isDeletable && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onDelete}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove transaction</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex items-center">
        <div className="flex flex-1 w-full md:w-1/2 flex-col gap-2.5 p-6 pt-4 pb-4">
          <div className="space-y-2 mb-2">
            <Label>Contract</Label>
            <Select
              value={selectedContractName || undefined}
              onValueChange={(value) => setSelectedContractName(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a contract..." />
              </SelectTrigger>
              <SelectContent>
                {contracts
                  ? Object.entries(contracts).map(([name, contract]) => (
                      <SelectItem key={name} value={name}>
                        <div className="flex gap-2 items-baseline text-left">
                          <span>{name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {chainId}:{contract.address}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  : selectedContractName &&
                    txn?.to && (
                      <SelectItem value={selectedContractName}>
                        <div className="flex gap-2 items-baseline text-left">
                          <span>{selectedContractName}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {chainId}:{txn.to}
                          </span>
                        </div>
                      </SelectItem>
                    )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 mb-2">
            <Label>Function</Label>
            <Select
              value={selectedFunction?.name || undefined}
              onValueChange={(value) => {
                const fn =
                  contracts && selectedContractName
                    ? (
                        contracts[selectedContractName].abi as AbiFunction[]
                      ).find((abi) => abi.name === value)
                    : undefined;
                setSelectedFunction(fn || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a function..." />
              </SelectTrigger>
              <SelectContent>
                {contracts && selectedContractName
                  ? (contracts[selectedContractName].abi as AbiFunction[])
                      .filter(
                        (abi) =>
                          abi.type === 'function' &&
                          abi.stateMutability !== 'view'
                      )
                      .map((abi) => (
                        <SelectItem key={abi.name} value={abi.name}>
                          <div className="flex gap-2 items-baseline text-left">
                            <span>{abi.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {viem.toFunctionSelector(abi)}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                  : selectedFunction && (
                      <SelectItem value={selectedFunction.name}>
                        <div className="flex gap-2 items-baseline text-left">
                          <span>{selectedFunction.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {viem.toFunctionSelector(selectedFunction)}
                          </span>
                        </div>
                      </SelectItem>
                    )}
              </SelectContent>
            </Select>
          </div>

          {!!selectedFunction?.inputs?.length && (
            <div className="space-y-2 mb-2">
              <Label>Parameters</Label>
              {selectedFunction.inputs.map((input, index) => (
                <div key={JSON.stringify(input)} className="mb-2">
                  <Label className="text-sm mb-1">
                    {input.name && <span>{input.name}</span>}
                    {input.type && (
                      <span className="text-xs font-mono text-muted-foreground ml-1">
                        {input.type}
                      </span>
                    )}
                  </Label>
                  <FunctionInput
                    key={JSON.stringify(input)}
                    input={input}
                    handleUpdate={(value) => {
                      const params = [...selectedParams];
                      params[index] = value;
                      setSelectedParams(params);
                    }}
                    initialValue={params[index]}
                  />
                </div>
              ))}
            </div>
          )}

          {selectedFunction?.stateMutability === 'payable' && (
            <div className="space-y-2 mb-4">
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
                    'rounded-r-none',
                    !valueIsValid && 'border-destructive'
                  )}
                  value={value?.toString()}
                  onChange={(e) => {
                    setValue(e.target.value);
                    try {
                      viem.parseEther(e.target.value);
                      setValueIsValid(true);
                    } catch (err) {
                      setValueIsValid(false);
                    }
                  }}
                />
                <div className="inline-flex items-center rounded-r-md border border-l-0 border-input bg-transparent px-3 text-sm text-muted-foreground">
                  ETH
                </div>
              </div>
              {valueIsValid && (
                <p className="text-sm text-muted-foreground">
                  {value !== undefined && valueIsValid
                    ? viem.parseEther(value.toString()).toString()
                    : 0}{' '}
                  wei
                </p>
              )}
            </div>
          )}

          {paramsEncodeError && (
            <Alert variant="destructive">
              <AlertTitle>Params Encode Error</AlertTitle>
              <AlertDescription className="text-sm">
                {paramsEncodeError}
              </AlertDescription>
            </Alert>
          )}

          {txnInfo.txnResults &&
            txnInfo.txnResults[0] &&
            txnInfo.txnResults[0]?.error &&
            contracts && (
              <Alert variant="destructive">
                <AlertTitle>Transaction Simulation Error</AlertTitle>
                <AlertDescription className="text-sm">
                  {txnInfo.txnResults[0]?.callResult
                    ? decodeError(
                        txnInfo.txnResults[0]?.callResult as any,
                        contracts[selectedContractName!].abi
                      )
                    : txnInfo.txnResults[0]?.error}
                </AlertDescription>
              </Alert>
            )}
        </div>
      </div>
    </div>
  );
}
