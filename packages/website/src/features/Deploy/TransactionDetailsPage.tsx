'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { parseHintedMulticall } from '@/helpers/cannon';
import { truncateAddress } from '@/helpers/ethereum';
import { getSafeTransactionHash } from '@/helpers/safe';
import { SafeDefinition, useStore } from '@/helpers/store';
import { useSafeTransactions, useTxnStager } from '@/hooks/backend';
import {
  useCannonBuild,
  useCannonPackage,
  useLoadCannonDefinition,
} from '@/hooks/cannon';
import { useTransactionDetailsParams } from '@/hooks/routing/useTransactionDetailsParams';
import {
  useExecutedTransactions,
  useGetPreviousGitInfoQuery,
} from '@/hooks/safe';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { SafeTransaction } from '@/types/SafeTransaction';
import {
  Cross2Icon,
  InfoCircledIcon,
  CheckIcon,
  ExternalLinkIcon,
} from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import _ from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as viem from 'viem';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import PublishUtility from './PublishUtility';
import { SimulateTransactionButton } from './SimulateTransactionButton';
import { TransactionDisplay } from './TransactionDisplay';
import { TransactionStepper } from './TransactionStepper';
import 'react-diff-view/style/index.css';
import { ChainDefinition } from '@usecannon/builder';
import { getChainDefinitionFromWorker } from '@/helpers/chain-definition';
import { useToast } from '@/hooks/use-toast';

const UnorderedNonceWarning = ({ nextNonce }: { nextNonce: number }) => (
  <Alert variant="warning" className="mt-3">
    <AlertDescription>
      You must execute transaction #{nextNonce} first.
    </AlertDescription>
  </Alert>
);

function TransactionDetailsPage() {
  const { safeAddress, chainId, nonce, sigHash } =
    useTransactionDetailsParams();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();
  const { getChainById, getExplorerUrl } = useCannonChains();
  const publicClient = usePublicClient();
  const walletChainId = useChainId();
  const account = useAccount();

  const currentSafe = useStore((s) => s.currentSafe);
  const [executionTxnHash, setExecutionTxnHash] = useState<viem.Hash | null>(
    null
  );
  const accountAlreadyConnected = useRef(account.isConnected);
  const chainDefinitionRef = useRef<ChainDefinition>();

  const safe: SafeDefinition = useMemo(
    () => ({
      chainId,
      address: safeAddress,
    }),
    [chainId, safeAddress]
  );

  const safeChain = useMemo(
    () => getChainById(safe.chainId),
    [safe, getChainById]
  );
  if (!safeChain) {
    throw new Error('Safe Chain not supported');
  }

  const {
    nonce: safeNonce,
    staged,
    refetch: refetchSafeTxs,
    isFetched: isSafeTxsFetched,
  } = useSafeTransactions(safe);

  const isTransactionExecuted = nonce < safeNonce;

  const { data: history, refetch: refetchHistory } =
    useExecutedTransactions(safe);

  // get the txn we want, we can just pluck it out of staged transactions if its there
  let safeTxn: SafeTransaction | null = null;

  if (safeNonce && nonce < safeNonce) {
    // TODO: the gnosis safe transaction history is quite long, but if its not on the first page, we have to call "next" to get more txns until
    // we find the nonce we want. no way to just get the txn we want unfortunately
    // also todo: code dup
    safeTxn =
      history.results.find(
        (txn: any) =>
          txn._nonce.toString() === nonce.toString() &&
          (!sigHash ||
            sigHash === txn.safeTxHash ||
            sigHash === getSafeTransactionHash(safe, txn))
      ) || null;
  } else if (Array.isArray(staged) && staged.length) {
    safeTxn =
      staged.find(
        (s) =>
          s.txn._nonce.toString() === nonce.toString() &&
          (!sigHash || sigHash === getSafeTransactionHash(safe, s.txn))
      )?.txn || null;
  }

  const unorderedNonce = safeTxn && safeTxn._nonce > staged[0]?.txn._nonce;
  const hintData = safeTxn
    ? parseHintedMulticall(safeTxn.data as viem.Hex)
    : null;

  const queuedWithGitOps = hintData?.type == 'deploy';

  useEffect(() => {
    const switchChain = async () => {
      if (account.isConnected && !accountAlreadyConnected.current) {
        accountAlreadyConnected.current = true;
        if (account.chainId !== currentSafe?.chainId.toString()) {
          try {
            await switchChainAsync({ chainId: currentSafe?.chainId || 1 });
          } catch (e) {
            toast({
              title:
                'Failed to switch chain, Your wallet must be connected to the same network as the selected Safe.',
              variant: 'destructive',
              duration: 5000,
            });
            return;
          }
        }
      }
    };
    void switchChain();
  }, [account.isConnected, currentSafe?.chainId]);

  const cannonPackage = useCannonPackage(hintData?.cannonPackage);

  // then reverse check the package referenced by the
  const { pkgUrl: existingRegistryUrl } = useCannonPackage(
    cannonPackage.fullPackageRef!,
    chainId
  );

  const stager = useTxnStager(safeTxn || {}, { safe: safe });
  const execTxn = useWriteContract();
  const { toast } = useToast();

  // git stuff
  const denom = hintData?.gitRepoUrl?.lastIndexOf(':');
  const gitUrl = hintData?.gitRepoUrl?.slice(0, denom);
  const gitFile = hintData?.gitRepoUrl?.slice((denom ?? 0) + 1);

  const prevDeployHashQuery = useGetPreviousGitInfoQuery(
    safe,
    hintData?.gitRepoUrl ?? ''
  );

  let prevDeployGitHash: string;
  if (queuedWithGitOps) {
    prevDeployGitHash =
      (hintData?.prevGitRepoHash || hintData?.gitRepoHash) ?? '';
  } else {
    prevDeployGitHash =
      prevDeployHashQuery.data &&
      prevDeployHashQuery.data[0].result &&
      ((prevDeployHashQuery.data[0].result as any).length as number) > 2
        ? ((prevDeployHashQuery.data[0].result as any).slice(2) as any)
        : hintData?.gitRepoHash;
  }

  const prevDeployPackageUrl = prevDeployHashQuery.data
    ? viem.hexToString(prevDeployHashQuery.data[1].result || ('' as any))
    : '';

  const prevCannonDeployInfo = useCannonPackage(
    (hintData?.cannonUpgradeFromPackage || prevDeployPackageUrl
      ? `ipfs://${_.last(
          (hintData?.cannonUpgradeFromPackage || prevDeployPackageUrl).split(
            '/'
          )
        )}`
      : null) || ''
  );

  const cannonDefInfo = useLoadCannonDefinition(
    gitUrl ?? '',
    hintData?.gitRepoHash ?? '',
    gitFile ?? ''
  );

  useEffect(() => {
    const getChainDef = async () => {
      if (!cannonDefInfo.def) return;

      chainDefinitionRef.current = await getChainDefinitionFromWorker({
        def: cannonDefInfo.def,
        chainId,
        timestamp: Date.now(),
      });
    };

    void getChainDef();
  }, [cannonDefInfo.def]);

  const buildInfo = useCannonBuild(safe);

  useEffect(() => {
    if (
      !safe ||
      !chainDefinitionRef.current ||
      !prevCannonDeployInfo.ipfsQuery.data?.deployInfo
    )
      return;
    buildInfo.doBuild(
      chainDefinitionRef.current,
      prevCannonDeployInfo.ipfsQuery.data?.deployInfo
    );
  }, [
    !isTransactionExecuted &&
      (!prevDeployGitHash || prevCannonDeployInfo.ipfsQuery.isFetched),
    chainDefinitionRef.current,
  ]);

  // compare proposed build info with expected transaction batch
  const expectedTxns = buildInfo.buildState?.result?.safeSteps?.map(
    (s) => s.tx as unknown as Partial<viem.TransactionRequestBase>
  );

  const unequalTransaction =
    expectedTxns &&
    (hintData?.txns.length !== expectedTxns.length ||
      hintData?.txns.find((t, i) => {
        return (
          t.to.toLowerCase() !== expectedTxns[i].to?.toLowerCase() ||
          t.data !== expectedTxns[i].data ||
          t.value.toString() !== expectedTxns[i].value?.toString()
        );
      }));

  const signers: viem.Address[] = stager.existingSigners.length
    ? stager.existingSigners
    : safeTxn?.confirmedSigners || [];

  const threshold =
    Number(stager.requiredSigners) || safeTxn?.confirmationsRequired || 0;

  const remainingSignatures = threshold - signers.length;

  const gitDiffContainerRef = useRef<HTMLDivElement>(null);

  const handleConnectWalletAndSign = async () => {
    if (!account.isConnected) {
      if (openConnectModal) {
        openConnectModal();
      }

      toast({
        title: 'In order to sign you must connect your wallet first.',
        variant: 'destructive',
        duration: 5000,
      });

      return;
    }

    if (account.chainId !== currentSafe?.chainId.toString()) {
      try {
        await switchChainAsync({ chainId: currentSafe?.chainId || 1 });
      } catch (e) {
        toast({
          title:
            'Failed to switch chain, Your wallet must be connected to the same network as the selected Safe.',
          variant: 'destructive',
          duration: 5000,
        });
        return;
      }
    }
  };

  const handleExecuteTx = () => {
    if (!stager.executeTxnConfig) {
      throw new Error('Missing execution tx configuration');
    }

    execTxn.writeContract(stager.executeTxnConfig, {
      onSuccess: async (hash) => {
        setExecutionTxnHash(hash);
        toast({
          title: 'Transaction sent to network',
          variant: 'default',
          duration: 5000,
        });

        // wait for the transaction to be mined
        await publicClient!.waitForTransactionReceipt({ hash });

        await refetchSafeTxs();
        await refetchHistory();

        toast({
          title: 'You successfully executed the transaction.',
          variant: 'default',
          duration: 5000,
        });

        setExecutionTxnHash(null);
      },
    });
  };

  if (!hintData) {
    return (
      <div className="container p-24 text-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (!safeTxn && isSafeTxsFetched) {
    return (
      <div className="container">
        <p>
          Transaction not found! Current safe nonce:{' '}
          {safeNonce ? safeNonce.toString() : 'none'}, Highest Staged Nonce:{' '}
          {(_.last(staged)?.txn._nonce || safeNonce).toString()}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-full mb-6">
      <div className="px-4 py-[24px] lg:py-[48px] border-b border-border">
        <div className="container max-w-[1024px]">
          <h1 className="text-2xl lg:text-3xl font-bold">
            Transaction #{nonce}
          </h1>
          {(hintData.type == 'deploy' || hintData.type == 'invoke') && (
            <div className="mt-4">
              <TransactionStepper
                chainId={chainId}
                cannonPackage={cannonPackage}
                safeTxn={safeTxn}
                published={existingRegistryUrl == hintData?.cannonPackage}
                publishable={queuedWithGitOps}
                signers={signers}
                threshold={threshold}
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-4">
          <div>
            {/* TX Info: left column */}
            <TransactionDisplay
              safe={safe}
              safeTxn={safeTxn as any}
              queuedWithGitOps={queuedWithGitOps}
              showQueueSource={true}
              isTransactionExecuted={isTransactionExecuted}
              containerRef={gitDiffContainerRef}
            />
          </div>

          {/* Tx extra data: right column */}
          <div>
            <div className="h-full">
              <div className="flex flex-col gap-4">
                {/* Verify txs */}
                {!isTransactionExecuted && !unorderedNonce && (
                  <Card className="rounded-sm">
                    <CardHeader>
                      <CardTitle>Verify Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {queuedWithGitOps && (
                        <div>
                          {buildInfo.buildState?.message && (
                            <p className="text-sm mb-2">
                              {buildInfo.buildState.message}
                            </p>
                          )}
                          {buildInfo.buildState?.error && (
                            <p className="text-sm mb-2">
                              {buildInfo.buildState.error}
                            </p>
                          )}
                          {buildInfo.buildState?.result &&
                            !unequalTransaction && (
                              <p className="text-sm mb-2">
                                The transactions queued to the Safe match the
                                Git Target
                              </p>
                            )}
                          {buildInfo.buildState?.result &&
                            unequalTransaction && (
                              <p className="text-sm mb-2">
                                <Cross2Icon className="inline-block mr-1" />
                                Proposed transactions do not match git diff.
                                Could be an attack.
                              </p>
                            )}
                          {prevDeployPackageUrl &&
                            hintData.cannonUpgradeFromPackage !==
                              prevDeployPackageUrl && (
                              <div className="flex items-start text-xs font-medium">
                                <InfoCircledIcon className="mt-0.5 mr-1.5" />
                                The previous deploy hash does not derive from an
                                onchain record.
                              </div>
                            )}
                        </div>
                      )}
                      <SimulateTransactionButton
                        signer={signers[0]}
                        safe={safe}
                        safeTxn={safeTxn}
                        execTransactionData={stager.execTransactionData}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Signatures or Execute info  */}
                <Card className="rounded-sm">
                  <CardHeader>
                    <CardTitle>Signatures</CardTitle>
                    <CardDescription>
                      {isTransactionExecuted
                        ? 'This transaction has been executed.'
                        : remainingSignatures === 0
                        ? 'This transaction is ready to be executed.'
                        : `${remainingSignatures} additional ${
                            remainingSignatures === 1
                              ? 'signature'
                              : 'signatures'
                          } required.`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {executionTxnHash ? (
                      /* Execution */
                      <a
                        href={getExplorerUrl(safeChain?.id, executionTxnHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium mt-3 hover:underline inline-flex items-center"
                      >
                        {truncateAddress((executionTxnHash || '') as string, 8)}
                        <Cross2Icon className="ml-1 transform -translate-y-[1px]" />
                      </a>
                    ) : (
                      /* Signatures */
                      <>
                        {/* Show signatures collected */}
                        <div className="flex flex-col gap-3">
                          {signers?.map((s) => (
                            <div key={s}>
                              <div className="inline-flex items-center justify-center w-5 h-5 mr-2.5 bg-teal-500 rounded-full">
                                <CheckIcon className="w-2.5 h-2.5 text-white" />
                              </div>
                              <span className="inline font-mono font-light text-gray-200">
                                {`${s.substring(0, 8)}...${s.slice(-6)}`}
                                <a
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1.5 hover:text-gray-300"
                                  href={getExplorerUrl(safeChain?.id, s)}
                                >
                                  <ExternalLinkIcon className="inline" />
                                </a>
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Warning if trying to sign a nonce bigger than the next to be executed */}
                        {!isTransactionExecuted && unorderedNonce && (
                          <UnorderedNonceWarning
                            nextNonce={staged[0]?.txn._nonce}
                          />
                        )}
                      </>
                    )}

                    {!isTransactionExecuted && !executionTxnHash && (
                      <div className="flex gap-4 mt-4">
                        {account.isConnected &&
                        walletChainId === safe.chainId ? (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex-1">
                                  <Button
                                    size="sm"
                                    className="w-full"
                                    disabled={
                                      stager.signing ||
                                      stager.alreadySigned ||
                                      executionTxnHash ||
                                      ((safeTxn &&
                                        !!stager.signConditionFailed) as any)
                                    }
                                    onClick={async () => {
                                      await stager.sign();
                                    }}
                                  >
                                    {stager.signing ? (
                                      <>
                                        Signing
                                        <div className="ml-2 animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                      </>
                                    ) : (
                                      'Sign'
                                    )}
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              {stager.signConditionFailed && (
                                <TooltipContent>
                                  {stager.signConditionFailed}
                                </TooltipContent>
                              )}
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex-1">
                                  <Button
                                    size="sm"
                                    className="w-full"
                                    disabled={
                                      stager.signing ||
                                      !stager.executeTxnConfig ||
                                      executionTxnHash ||
                                      ((safeTxn &&
                                        !!stager.execConditionFailed) as any)
                                    }
                                    onClick={handleExecuteTx}
                                  >
                                    {remainingSignatures === 1
                                      ? 'Sign and Execute'
                                      : 'Execute'}
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              {stager.execConditionFailed && (
                                <TooltipContent>
                                  {stager.execConditionFailed}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </>
                        ) : (
                          <Button
                            className="w-full"
                            onClick={handleConnectWalletAndSign}
                          >
                            {account.isConnected
                              ? `Switch to ${safeChain.name}`
                              : 'Connect Wallet'}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cannon package IPFS Info */}
                {queuedWithGitOps && isTransactionExecuted && (
                  <Card className="rounded-sm">
                    <CardHeader>
                      <CardTitle>Cannon Package</CardTitle>
                      <CardDescription className="flex items-center">
                        <span>
                          This includes smart contract addresses, ABIs, and
                          source code if made public.
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PublishUtility
                        deployUrl={hintData.cannonPackage}
                        targetChainId={safe.chainId}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransactionDetailsPage;
