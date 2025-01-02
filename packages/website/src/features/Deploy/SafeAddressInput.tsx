'use client';

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
import { cn } from '@/lib/utils';
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
  const { chains } = useCannonChains();
  const { switchChain } = useSwitchChain();

  const router = useRouter();

  const safeOptions = _safesToOptions(safeAddresses, { isDeletable: true });
  const walletSafeOptions = _safesToOptions(
    walletSafes.filter((s: any) => !includes(safeAddresses, s))
  );

  const handleNewOrSelectedSafe = async (safeString: string) => {
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
    if (!isValidSafeString(safeString)) {
      return;
    }
    deleteSafe(parseSafe(safeString));
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

        if (
          !currentSafe ||
          currentSafe.chainId !== safeFromUrl.chainId ||
          currentSafe.address !== safeFromUrl.address
        ) {
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
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    handleNewOrSelectedSafe,
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
        'Invalid Safe Address. If you are using a custom chain, configure a custom PRC in the settings page.'
      );
      return;
    }
    await handleNewOrSelectedSafe(newSafeInput);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex items-center gap-2',
            !currentSafe && 'text-muted-foreground'
          )}
        >
          {currentSafe ? (
            <>
              <Chain isSmall id={currentSafe.chainId} />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="font-mono md:hidden">
                      {truncateAddress(currentSafe.address, 4)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{currentSafe.address}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <span className="font-mono hidden md:inline">
                {currentSafe.address}
              </span>
            </>
          ) : (
            'Select a Safe'
          )}
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={() => setIsDialogOpen(true)}
                className="h-5 w-5 ml-0.5"
              >
                <ChevronsUpDown className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Select Safe</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Safe</DialogTitle>
            </DialogHeader>
            <div className="space-y-10 mt-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  {safeOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center justify-between gap-1"
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
                              <span className="font-mono tracking-wider">
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
                          onClick={() => handleSafeDelete(option.value)}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

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
                                    12
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
                  <div className="relative flex items-center">
                    <Input
                      value={newSafeInput}
                      onChange={(e) => setNewSafeInput(e.target.value)}
                      placeholder="chainId:safeAddress"
                      className="pr-[88px]"
                    />
                    <Button
                      onClick={handleAddNewSafe}
                      className="absolute right-0 h-[35px] rounded-l-none"
                    >
                      Add Safe
                    </Button>
                  </div>
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
