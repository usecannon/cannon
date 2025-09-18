'use client';

import ClientOnly from '@/components/ClientOnly';
import { links } from '@/constants/links';
import WithSafe from '@/features/Deploy/WithSafe';
import { isValidHex } from '@/helpers/ethereum';
import { makeMultisend } from '@/helpers/multisend';
import { useQueueTxsStore, useStore } from '@/helpers/store';
import { useTxnStager } from '@/hooks/backend';
import { useCannonPackageContracts } from '@/hooks/cannon';
import { useSimulatedTxns } from '@/hooks/fork';
import { SafeTransaction } from '@/types/SafeTransaction';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import * as viem from 'viem';
import { useAccount, useWriteContract } from 'wagmi';
import NoncePicker from './NoncePicker';
import { QueueTransaction } from './QueueTransaction';
import { SafeAddressInput } from './SafeAddressInput';
import 'react-diff-view/style/index.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CustomSpinner } from '@/components/CustomSpinner';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useDeployInputStore } from '@/helpers/store';

// Because of a weird type cohercion, after using viem.isAddress during website build,
// the string type of the given value gets invalid to "never", and breaks the build.
const isAddress = (val: any): boolean =>
  typeof val === 'string' && viem.isAddress(val);

export const QueuedTxns = ({
  onDrawerClose,
}: {
  onDrawerClose?: () => void;
}) => {
  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const [customTxnData, setCustomTxnData] = useState<viem.Address>();
  const customTxnDataIsValid = isValidHex(customTxnData || '');
  const currentSafe = useStore((s) => s.currentSafe);
  const router = useRouter();
  const { safes, setQueuedIdentifiableTxns, setLastQueuedTxnsId } =
    useQueueTxsStore((s) => s);
  const { setInput } = useDeployInputStore();

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

  const [target, setTarget] = useState<string>('');

  const [pickedNonce, setPickedNonce] = useState<number | null>(null);

  const cannonInfo = useCannonPackageContracts(target, currentSafe?.chainId);

  const queuedTxns = queuedIdentifiableTxns
    .map((item) => item.txn)
    .filter((txn) => !!txn);

  const pkgUrlString = queuedIdentifiableTxns
    .map((txn) => txn.pkgUrl)
    .join(',');

  const targetTxn: Partial<SafeTransaction> =
    queuedTxns.length > 0
      ? makeMultisend([
          {
            to: viem.zeroAddress,
            data: viem.encodeAbiParameters(
              [{ type: 'string[]' }],
              [['invoke', pkgUrlString]]
            ),
          } as Partial<viem.TransactionRequestBase>,
          ...queuedTxns,
        ])
      : {};

  const txnInfo = useSimulatedTxns(currentSafe as any, queuedTxns);

  const stager = useTxnStager(
    targetTxn
      ? {
          to: targetTxn.to as `0x${string}`,
          value: targetTxn.value ? targetTxn.value.toString() : undefined,
          data: targetTxn.data,
          safeTxGas: txnInfo.txnResults.length
            ? txnInfo.txnResults
                .reduce((prev, cur) => ({
                  gasUsed:
                    (prev?.gasUsed || BigInt(0)) + (cur?.gasUsed || BigInt(0)),
                  callResult: '0x',
                }))
                ?.gasUsed.toString()
            : undefined,
          operation: '1',
          _nonce: pickedNonce === null ? undefined : pickedNonce,
        }
      : {},
    {
      safe: currentSafe!,
      async onSignComplete() {
        if (onDrawerClose) onDrawerClose();
        await router.push(links.DEPLOY);
        toast.success('You successfully signed the transaction.');

        setQueuedIdentifiableTxns({
          queuedIdentifiableTxns: [],
          safeId: `${currentSafe?.chainId}:${currentSafe?.address}`,
        });
        setLastQueuedTxnsId({
          lastQueuedTxnsId: 0,
          safeId: `${currentSafe?.chainId}:${currentSafe?.address}`,
        });
      },
    }
  );

  const execTxn = useWriteContract();

  const funcIsPayable = false;

  function updateQueuedTxn(
    i: number,
    txn: Omit<viem.TransactionRequestBase, 'from'>,
    fn?: viem.AbiFunction,
    params?: any[] | any,
    contractName?: string | null,
    target?: string | null,
    chainId?: number | null
  ) {
    setQueuedIdentifiableTxns({
      queuedIdentifiableTxns: queuedIdentifiableTxns.map((item, index) =>
        index === i
          ? {
              ...item,
              txn,
              fn: fn || item.fn,
              params: params || item.params,
              contractName: contractName || item.contractName,
              target: target || item.target,
              chainId: chainId || item.chainId,
            }
          : item
      ),
      safeId: `${currentSafe?.chainId}:${currentSafe?.address}`,
    });
  }

  const removeQueuedTxn = (i: number) => {
    setQueuedIdentifiableTxns({
      queuedIdentifiableTxns: queuedIdentifiableTxns.filter(
        (_, index) => index !== i
      ),
      safeId: `${currentSafe?.chainId}:${currentSafe?.address}`,
    });
    setLastQueuedTxnsId({
      lastQueuedTxnsId: lastQueuedTxnsId - 1,
      safeId: `${currentSafe?.chainId}:${currentSafe?.address}`,
    });
  };

  const addQueuedTxn = () => {
    setInput(target);
    setQueuedIdentifiableTxns({
      queuedIdentifiableTxns: [
        ...queuedIdentifiableTxns,
        {
          txn: {},
          id: String(lastQueuedTxnsId + 1),
          chainId: currentSafe?.chainId as number,
          target,
          pkgUrl: cannonInfo.pkgUrl || '',
        },
      ],
      safeId: `${currentSafe?.chainId}:${currentSafe?.address}`,
    });
    setLastQueuedTxnsId({
      lastQueuedTxnsId: lastQueuedTxnsId + 1,
      safeId: `${currentSafe?.chainId}:${currentSafe?.address}`,
    });
  };

  const handleAddCustomTxn = () => {
    if (customTxnData && customTxnDataIsValid) {
      setQueuedIdentifiableTxns({
        queuedIdentifiableTxns: [
          ...queuedIdentifiableTxns,
          {
            txn: {
              to: target as `0x${string}`,
              data: customTxnData as `0x${string}`,
            },
            id: String(lastQueuedTxnsId + 1),
            chainId: currentSafe?.chainId as number,
            target,
            pkgUrl: '',
          },
        ],
        safeId: `${currentSafe?.chainId}:${currentSafe?.address}`,
      });
      setLastQueuedTxnsId({
        lastQueuedTxnsId: lastQueuedTxnsId + 1,
        safeId: `${currentSafe?.chainId}:${currentSafe?.address}`,
      });
      setCustomTxnData('' as viem.Address);
      setTarget('');
    }
  };

  const txnsWithErrorIndexes = txnInfo.txnResults
    .map((r, idx) => (r?.error ? idx : -1))
    .filter((i) => i !== -1);
  const txnHasError = txnsWithErrorIndexes.length > 0;

  const disableExecute = !targetTxn || !!stager.execConditionFailed;

  const renderSimulationStatus = () => {
    // if there is only one transaction or zero, we don't need to show the status
    if (queuedIdentifiableTxns.length <= 1) {
      return null;
    }
    return (
      <div className="my-8">
        {txnInfo.loading ? (
          <div className="flex flex-col w-full justify-left items-center gap-4 p-4 border border-border rounded-lg">
            <CustomSpinner className="w-4 h-4" />
            <p className="text-sm text-muted-foreground">
              Simulating transactions...
            </p>
          </div>
        ) : txnsWithErrorIndexes.length > 0 &&
          queuedIdentifiableTxns.length > 1 ? (
          <div className="flex flex-col gap-4">
            {/* This error messages just show up when simulated txns are more
            than 1, and just shows up the first error */}
            <Alert variant="destructive">
              <AlertTitle>Transaction Simulation Failed</AlertTitle>
              <AlertDescription>
                Transaction #{txnsWithErrorIndexes[0] + 1} failed with error:{' '}
                {txnInfo.txnResults[txnsWithErrorIndexes[0]]?.error}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          (txnsWithErrorIndexes.length === 0 &&
            queuedIdentifiableTxns.length > 1 && (
              <Alert variant="info" data-testid="txs-alert">
                <AlertTitle>All Transactions Simulated Successfully</AlertTitle>
                <AlertDescription>
                  {queuedIdentifiableTxns.length} simulated transaction
                  {queuedIdentifiableTxns.length > 1 ? 's ' : ' '}
                  succeeded
                </AlertDescription>
              </Alert>
            )) ||
          null
        )}
      </div>
    );
  };

  return (
    <>
      <div className="mt-6 mb-8">
        {queuedIdentifiableTxns.length > 0 ? (
          <>
            {queuedIdentifiableTxns.map((queuedIdentifiableTxn, i) => (
              <div
                key={i}
                className="mb-8 p-0 bg-black border border-border rounded-lg relative overflow-hidden"
              >
                <QueueTransaction
                  key={queuedIdentifiableTxn.id}
                  onChange={(txn, fn, params, contractName, target, chainId) =>
                    updateQueuedTxn(
                      i,
                      txn as any,
                      fn,
                      params,
                      contractName,
                      target,
                      chainId
                    )
                  }
                  onDelete={() => removeQueuedTxn(i)}
                  txn={queuedIdentifiableTxn.txn}
                  fn={queuedIdentifiableTxn.fn}
                  params={queuedIdentifiableTxn.params}
                  contractName={queuedIdentifiableTxn.contractName}
                  target={queuedIdentifiableTxn.target}
                  chainId={queuedIdentifiableTxn.chainId}
                  isCustom={queuedIdentifiableTxn.pkgUrl === ''}
                  isDeletable
                  // simulate single transaction if there is only one
                  simulate={queuedIdentifiableTxns.length === 1}
                />
              </div>
            ))}
            {renderSimulationStatus()}
          </>
        ) : null}
        <div className="mb-8 mt-8 p-6 bg-black border border-border rounded-lg">
          <div className="space-y-2">
            <Label>
              Add a transaction using a Cannon package or contract address
            </Label>
            <div className="relative">
              <Input
                name="target-input"
                type="text"
                className="bg-black"
                onChange={(event: any) => setTarget(event.target.value)}
                value={target}
                data-testid="target-input"
              />
              {!isAddress(target) &&
                target.length >= 3 &&
                cannonInfo.registryQuery.status === 'pending' && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin h-4 w-4 border-2 border-border border-t-foreground rounded-full opacity-80" />
                  </div>
                )}
              {!isAddress(target) && cannonInfo.contracts && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => addQueuedTxn()}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  data-testid="add-txs-button"
                >
                  +
                </Button>
              )}

              {!isAddress(target) &&
                target.length >= 3 &&
                cannonInfo.registryQuery.status === 'error' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Failed to find this package on the registry.
                  </p>
                )}
              {!isAddress(target) &&
                cannonInfo.pkgUrl &&
                cannonInfo.ipfsQuery.status === 'pending' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Downloading {cannonInfo.pkgUrl}
                  </p>
                )}
              {!isAddress(target) &&
                cannonInfo.pkgUrl &&
                cannonInfo.ipfsQuery.status === 'error' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Failed to load {cannonInfo.pkgUrl}
                  </p>
                )}
            </div>
          </div>

          {isAddress(target) && (
            <div className="mt-4 space-y-4">
              {funcIsPayable && (
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    type="text"
                    className="bg-black"
                    onChange={(event: any) =>
                      updateQueuedTxn(0, {
                        ...queuedTxns[0],
                        value: BigInt(event.target.value),
                      })
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Amount of ETH to send as part of transaction
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Transaction Data</Label>
                <Input
                  type="text"
                  className="bg-black"
                  placeholder="0x"
                  onChange={(e) =>
                    setCustomTxnData(e.target.value as viem.Address)
                  }
                />
                {customTxnData && !customTxnDataIsValid && (
                  <p className="text-sm text-red-500">
                    Invalid transaction data
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  0x prefixed hex code data to send with transaction
                </p>
                <Button
                  variant="default"
                  onClick={handleAddCustomTxn}
                  disabled={!customTxnData || !customTxnDataIsValid}
                  className="w-full"
                >
                  Add Transaction
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mb-4">
        {queuedIdentifiableTxns.length > 0 && (
          <div>
            <div className="flex flex-col gap-2.5 mb-4">
              <NoncePicker safe={currentSafe} handleChange={setPickedNonce} />

              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>
                  Transactions queued here will not generate a Cannon package
                  after execution.
                </span>
              </p>

              {txnHasError && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Some transactions failed to simulate. You can still execute
                    / stage the transactions.
                  </span>
                </p>
              )}

              {stager.signConditionFailed && (
                <Alert variant="destructive">
                  <AlertTitle>Cannot Sign Transaction</AlertTitle>
                  <AlertDescription>
                    {stager.signConditionFailed}
                  </AlertDescription>
                </Alert>
              )}

              {stager.execConditionFailed && (
                <Alert variant="destructive">
                  <AlertTitle>Cannot Execute Transaction</AlertTitle>
                  <AlertDescription>
                    {stager.execConditionFailed}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {!account.isConnected ? (
              <Button
                onClick={openConnectModal}
                size="lg"
                variant="default"
                className="w-full"
              >
                Connect Wallet
              </Button>
            ) : (
              <div className="flex gap-6">
                {disableExecute ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full">
                        <Button
                          size="lg"
                          variant="default"
                          className="w-full"
                          disabled={
                            stager.signing ||
                            !targetTxn ||
                            !!stager.signConditionFailed ||
                            queuedIdentifiableTxns.length === 0
                          }
                          onClick={async () => {
                            await stager.sign();
                          }}
                        >
                          {stager.signing ? (
                            <div className="flex items-center gap-2">
                              Currently Signing
                              <CustomSpinner />
                            </div>
                          ) : (
                            'Stage & Sign'
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {stager.signConditionFailed}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Button
                        size="lg"
                        variant="default"
                        className="w-full"
                        disabled={disableExecute}
                        onClick={() => {
                          execTxn.writeContract(stager.executeTxnConfig!, {
                            onSuccess: async () => {
                              await router.push(links.DEPLOY);

                              toast.success(
                                'You successfully executed the transaction.'
                              );
                            },
                          });
                        }}
                      >
                        Execute
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{stager.execConditionFailed}</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

const QueueDrawer = ({
  isOpen,
  onOpen,
  onClose,
}: {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) => {
  return (
    <>
      {!isOpen && (
        <Button
          onClick={onOpen}
          size="icon"
          variant="outline"
          className="fixed top-1/2 right-0 -translate-y-1/2 translate-x-[1px] rounded-r-none z-[51] bg-black hover:bg-teal-900 hover:border-teal-500 border-border"
          data-testid="queue-button"
        >
          <svg width="16" height="16" viewBox="0 0 39 40" fill="none">
            <path
              d="M2.22855 19.5869H6.35167C7.58312 19.5869 8.58087 20.6155 8.58087 21.8847V28.0535C8.58087 29.3227 9.57873 30.3513 10.8101 30.3513H27.2131C28.4445 30.3513 29.4424 31.3798 29.4424 32.6492V36.8993C29.4424 38.1685 28.4445 39.1971 27.2131 39.1971H9.86067C8.62922 39.1971 7.6457 38.1685 7.6457 36.8993V33.4893C7.6457 32.2201 6.64783 31.3196 5.41638 31.3196H2.22938C0.99805 31.3196 0.000190262 30.2911 0.000190262 29.0217V21.8581C0.000190262 20.5888 0.997223 19.5869 2.22855 19.5869Z"
              fill="currentColor"
            />
            <path
              d="M29.4429 11.1437C29.4429 9.87434 28.4451 8.84578 27.2136 8.84578H10.8207C9.58924 8.84578 8.5915 7.81722 8.5915 6.54797V2.29787C8.5915 1.02853 9.58924 0 10.8207 0H28.164C29.3953 0 30.3932 1.02853 30.3932 2.29787V5.57274C30.3932 6.84199 31.3909 7.87055 32.6224 7.87055H35.7952C37.0266 7.87055 38.0244 8.89911 38.0244 10.1685V17.3398C38.0244 18.6092 37.0224 19.5861 35.791 19.5861H31.668C30.4365 19.5861 29.4387 18.5576 29.4387 17.2883L29.4429 11.1437Z"
              fill="currentColor"
            />
            <path
              d="M20.9524 15.1196H16.992C15.7013 15.1196 14.6543 16.1997 14.6543 17.5293V21.6117C14.6543 22.942 15.7021 24.0212 16.992 24.0212H20.9524C22.243 24.0212 23.29 22.9411 23.29 21.6117V17.5293C23.29 16.1989 22.2422 15.1196 20.9524 15.1196Z"
              fill="currentColor"
            />
          </svg>
        </Button>
      )}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="bg-background border-border w-[90vw] sm:max-w-[540px] overflow-y-auto max-h-screen">
          <SheetHeader>
            <SheetTitle>Stage Transactions to a Safe</SheetTitle>
          </SheetHeader>
          <div className="pt-4">
            <ClientOnly>
              <SafeAddressInput />
            </ClientOnly>
            <WithSafe>
              <QueuedTxns onDrawerClose={onClose} />
            </WithSafe>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default QueueDrawer;
