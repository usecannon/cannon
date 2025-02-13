'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { parseHintedMulticall } from '@/helpers/cannon';
import { getSafeTransactionHash } from '@/helpers/safe';
import { SafeDefinition } from '@/helpers/store';
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
import _ from 'lodash';
import React, { useEffect, useMemo, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';
import PublishUtility from './PublishUtility';
import { TransactionDisplay } from './TransactionDisplay';
import { TransactionStepper } from './TransactionStepper';
import 'react-diff-view/style/index.css';
import { ChainDefinition } from '@usecannon/builder';
import { getChainDefinitionFromWorker } from '@/helpers/chain-definition';
import SimulateSafeTx from '@/features/Deploy/SimulateSafeTx';
import { SafeSignExecuteButtons } from './SafeSignExecuteButtons';
import { Address, Hex, hexToString, TransactionRequestBase } from 'viem';

function TransactionDetailsPage() {
  const { safeAddress, chainId, nonce, sigHash } =
    useTransactionDetailsParams();

  const { getChainById } = useCannonChains();
  const walletChainId = useChainId();
  const account = useAccount();

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

  const stager = useTxnStager(safeTxn || {}, { safe: safe });

  const unorderedNonce = safeTxn && safeTxn._nonce > staged[0]?.txn._nonce;
  const hintData = safeTxn ? parseHintedMulticall(safeTxn.data as Hex) : null;

  const queuedWithGitOps = hintData?.type == 'deploy';

  const cannonPackage = useCannonPackage(hintData?.cannonPackage);

  // then reverse check the package referenced by the
  const { pkgUrl: existingRegistryUrl } = useCannonPackage(
    cannonPackage.fullPackageRef!,
    chainId
  );

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
    ? hexToString(prevDeployHashQuery.data[1].result || ('' as any))
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

      chainDefinitionRef.current = await getChainDefinitionFromWorker(
        cannonDefInfo.def
      );
    };

    void getChainDef();
  }, [cannonDefInfo.def]);

  const buildInfo = useCannonBuild(safe);

  useEffect(() => {
    if (
      !safe ||
      !chainDefinitionRef.current ||
      !prevCannonDeployInfo.ipfsQuery.data?.deployInfo
    ) {
      return;
    }

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
    (s) => s.tx as unknown as Partial<TransactionRequestBase>
  );

  const unequalTransaction = Boolean(
    expectedTxns &&
      (hintData?.txns.length !== expectedTxns.length ||
        hintData?.txns.find((t, i) => {
          return (
            t.to.toLowerCase() !== expectedTxns[i].to?.toLowerCase() ||
            t.data !== expectedTxns[i].data ||
            t.value.toString() !== expectedTxns[i].value?.toString()
          );
        }))
  );

  const signers: Address[] = stager.existingSigners.length
    ? stager.existingSigners
    : safeTxn?.confirmedSigners || [];

  const threshold =
    Number(stager.requiredSigners) || safeTxn?.confirmationsRequired || 0;

  const gitDiffContainerRef = useRef<HTMLDivElement>(null);

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
              safeSteps={buildInfo.buildState?.result?.safeSteps}
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
                  <SimulateSafeTx
                    queuedWithGitOps={queuedWithGitOps}
                    buildMessage={buildInfo.buildState?.message}
                    buildError={buildInfo.buildState?.error}
                    buildCompleted={Boolean(buildInfo.buildState?.result)}
                    unequalTransaction={unequalTransaction}
                    showPrevDeployWarning={Boolean(
                      prevDeployPackageUrl &&
                        hintData.cannonUpgradeFromPackage !==
                          prevDeployPackageUrl
                    )}
                    safeSigner={signers[0]}
                    safe={safe}
                    safeTxn={safeTxn}
                    execTransactionData={stager.execTransactionData}
                  />
                )}

                {/* Signatures or Execute info  */}
                <SafeSignExecuteButtons
                  safe={safe}
                  safeTxn={safeTxn}
                  stager={stager}
                  staged={staged}
                  signers={signers}
                  threshold={threshold}
                  isTransactionExecuted={isTransactionExecuted}
                  unorderedNonce={unorderedNonce}
                  walletChainId={walletChainId}
                  accountConnected={account.isConnected}
                  refetchSafeTxs={refetchSafeTxs}
                  refetchHistory={refetchHistory}
                />

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
