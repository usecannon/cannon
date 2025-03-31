'use client';

import deepEqual from 'fast-deep-equal';
import { includes } from '@/helpers/array';
import { State, useStore } from '@/helpers/store';
import {
  isValidSafe,
  isValidSafeFromSafeString,
  isValidSafeString,
  parseSafe,
  SafeString,
  safeToString,
  usePendingTransactions,
  useWalletPublicSafes,
} from '@/hooks/safe';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { useSwitchChain } from 'wagmi';
import omit from 'lodash/omit';
import { truncateAddress } from '@/helpers/ethereum';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { X, AlertTriangle, ChevronsUpDown } from 'lucide-react';
import Chain from '@/features/Search/PackageCard/Chain';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

type SafeOption = {
  value: SafeString;
  label: string;
  isDeletable?: boolean;
};

export function SafeAddressInput() {
  const currentSafe = useStore((s) => s.currentSafe);
  const safeAddresses = useStore((s) => s.safeAddresses);
  const setCurrentSafe = useStore((s) => s.setCurrentSafe);
  const [inputErrorText, setInputErrorText] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSafeInput, setNewSafeInput] = useState('');

  const [isClearing, setIsClearing] = useState(false);

  const deleteSafe = useStore((s) => s.deleteSafe);
  const prependSafeAddress = useStore((s) => s.prependSafeAddress);

  const walletSafes = useWalletPublicSafes();
  const pendingServiceTransactions = usePendingTransactions(
    currentSafe || undefined
  );
  const { chains, chainMetadata } = useCannonChains();
  const { switchChain } = useSwitchChain();

  const router = useRouter();

  const safeOptions = _safesToOptions(safeAddresses, { isDeletable: true });
  const walletSafeOptions = _safesToOptions(
    walletSafes.filter((s: any) => !includes(safeAddresses, s))
  );

  const handleNewOrSelectedSafe = async (safeString: string) => {
    console.log('handle new or selected safe', safeString);
    if (safeString == '') {
      setIsClearing(true);
      setCurrentSafe(null);
      await router.push({
        pathname: router.pathname,
        query: omit(router.query, ['chainId', 'address']),
      });
      setIsClearing(false);
      return;
    }

    if (!isValidSafeString(safeString)) {
      return;
    }
    const parsedSafeInput = parseSafe(safeString);

    if (!isValidSafe(parsedSafeInput, chains)) {
      return;
    }

    await router.push({
      pathname: router.pathname,
      query: {
        ...router.query,
        chainId: parsedSafeInput.chainId.toString(),
        address: parsedSafeInput.address,
      },
    });
    setIsDialogOpen(false);
  };

  function handleSafeDelete(safeString: SafeString) {
    if (!isValidSafeString(safeString)) return;

    const parsedSafe = parseSafe(safeString);
    deleteSafe(parsedSafe);

    // If we're deleting the currently selected safe, clear it and redirect
    if (
      currentSafe &&
      currentSafe.chainId === parsedSafe.chainId &&
      currentSafe.address === parsedSafe.address
    ) {
      setIsClearing(true);
      void router
        .push({
          pathname: '/deploy',
          query: {},
        })
        .then(() => {
          setCurrentSafe(null);
          setIsClearing(false);
        });
    }
  }

  // Load the safe address from url
  useEffect(() => {
    const loadSafeFromUrl = async () => {
      if (isClearing) {
        return;
      }

      const { address, chainId } = router.query;

      if (address && chainId) {
        const safeFromUrl = parseSafe(`${chainId}:${address}`);
        if (!isValidSafe(safeFromUrl, chains)) {
          throw new Error(
            "We couldn't find a safe for the specified chain. If it is a custom chain, please ensure that a custom provider is properly configured in the settings page."
          );
        }

        if (!deepEqual(currentSafe, safeFromUrl)) {
          setCurrentSafe(safeFromUrl);
        }

        if (!includes(safeAddresses, safeFromUrl)) {
          prependSafeAddress(safeFromUrl);
        }

        if (switchChain) {
          await switchChain({ chainId: safeFromUrl.chainId });
        }
      } else if (currentSafe) {
        await handleNewOrSelectedSafe(safeToString(currentSafe));
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadSafeFromUrl().catch((error: any) => {
      toast.error('Error loading safe from URL', {
        description: error.message || 'An unknown error occurred',
      });
    });
  }, [
    chains,
    currentSafe,
    isClearing,
    prependSafeAddress,
    router,
    safeAddresses,
    setCurrentSafe,
    switchChain,
  ]);

  const handleAddNewSafe = async () => {
    setInputErrorText('');
    const isValid = isValidSafeFromSafeString(newSafeInput, chains);
    if (!isValid) {
      setInputErrorText(
        'Invalid Safe Address. If you are using a custom chain, add a custom provider in settings.'
      );
      return;
    }
    await handleNewOrSelectedSafe(newSafeInput);
    setNewSafeInput('');
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {currentSafe ? (
          <>
            <div
              className="flex items-center gap-1 pl-2"
              data-testid="selected-safe"
            >
              <Chain isSmall id={currentSafe.chainId} />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="font-mono md:hidden">
                      {chainMetadata[currentSafe.chainId]?.shortName
                        ? `${chainMetadata[currentSafe.chainId].shortName}:`
                        : ''}
                      {truncateAddress(currentSafe.address, 4)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{currentSafe.address}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <span className="font-mono hidden md:inline">
                {chainMetadata[currentSafe.chainId]?.shortName
                  ? `${chainMetadata[currentSafe.chainId].shortName}:`
                  : ''}
                {currentSafe.address}
              </span>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={() => setIsDialogOpen(true)}
                    className="h-5 w-5 ml-0.5"
                    data-testid="safe-select-button"
                  >
                    <ChevronsUpDown className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select Safe</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        ) : (
          <Button
            onClick={() => setIsDialogOpen(true)}
            size="sm"
            data-testid="safe-select-button"
          >
            Select Safe
          </Button>
        )}

        <Dialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          modal={false}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Safe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-4">
                {safeOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center justify-between gap-1.5"
                  >
                    <Button
                      variant="secondary"
                      disabled={Boolean(
                        currentSafe &&
                          option.value === safeToString(currentSafe)
                      )}
                      className="flex-1 flex items-center justify-between"
                      onClick={() => {
                        void handleNewOrSelectedSafe(option.value);
                        setIsDialogOpen(false);
                      }}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="font-mono tracking-wider md:hidden">
                              {truncateAddress(option.value.split(':')[1], 4)}
                            </span>
                            <span className="font-mono tracking-wider hidden md:inline">
                              {truncateAddress(option.value.split(':')[1], 8)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{option.value.split(':')[1]}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Chain id={parseInt(option.value.split(':')[0])} />
                    </Button>
                    {option.isDeletable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSafeDelete(option.value);
                          if (
                            currentSafe &&
                            safeToString(currentSafe) === option.value
                          ) {
                            setIsDialogOpen(false);
                          }
                        }}
                        data-testid="safe-delete-button"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}

                {walletSafeOptions.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium">Owned Safes</h3>
                    <div className="space-y-2">
                      {walletSafeOptions.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center justify-between p-2 rounded-md border border-zinc-800 hover:bg-zinc-900 cursor-pointer"
                          onClick={() => {
                            void handleNewOrSelectedSafe(option.value);
                            setIsDialogOpen(false);
                          }}
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="font-mono tracking-wider">
                                  {truncateAddress(
                                    option.value.split(':')[1],
                                    8
                                  )}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{option.value.split(':')[1]}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Chain id={parseInt(option.value.split(':')[0])} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleAddNewSafe();
                    }}
                  >
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-sm mb-2 block text-muted-foreground">
                          Chain ID
                        </label>
                        <Input
                          data-testid="safe-chain-input"
                          value={newSafeInput.split(':')[0] || ''}
                          onChange={(e) =>
                            setNewSafeInput(
                              `${e.target.value}:${
                                newSafeInput.split(':')[1] || ''
                              }`
                            )
                          }
                          placeholder="1"
                          type="number"
                        />
                      </div>
                      <div className="flex-[3]">
                        <label className="text-sm mb-2 block text-muted-foreground">
                          Safe Address
                        </label>
                        <div className="flex gap-4">
                          <Input
                            data-testid="safe-address-input"
                            value={newSafeInput.split(':')[1] || ''}
                            onChange={(e) =>
                              setNewSafeInput(
                                `${newSafeInput.split(':')[0] || ''}:${
                                  e.target.value
                                }`
                              )
                            }
                            placeholder="0x..."
                            className="flex-1"
                          />
                          <Button type="submit" data-testid="safe-add-button">
                            Add Safe
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                  {inputErrorText && (
                    <p className="mt-2 text-sm text-red-400">
                      {inputErrorText}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {currentSafe && pendingServiceTransactions.count > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AlertTriangle className="h-5 w-5 text-orange-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p>
                There{' '}
                {pendingServiceTransactions.count === 1
                  ? 'is 1 pending transaction'
                  : `are ${pendingServiceTransactions.count} pending transactions`}{' '}
                on the Safe app. Any transactions executed using Cannon will
                override transactions there.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

function _safeToOption(
  safe: State['currentSafe'],
  extraProps: { isDeletable?: boolean } = {}
) {
  const option = {
    value: safeToString(safe as any),
    label: safeToString(safe as any) as string,
  } as SafeOption;
  if (extraProps.isDeletable) option.isDeletable = true;
  return option;
}

function _safesToOptions(
  safes: State['safeAddresses'],
  extraProps: { isDeletable?: boolean } = {}
) {
  return safes.map((s: any) => _safeToOption(s, extraProps));
}
