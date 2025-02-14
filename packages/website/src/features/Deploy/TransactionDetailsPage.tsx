'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  useCannonBuild,
  useCannonPackage,
  useLoadCannonDefinition,
} from '@/hooks/cannon';
import { useTransactionDetailsParams } from '@/hooks/routing/useTransactionDetailsParams';

import { useCannonChains } from '@/providers/CannonProvidersProvider';

import _ from 'lodash';
import React, { useEffect, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';
import PublishUtility from './PublishUtility';
import { TransactionDisplay } from './TransactionDisplay';
import { TransactionStepper } from './TransactionStepper';
import SimulateSafeTx from '@/features/Deploy/SimulateSafeTx';
import { SafeSignExecuteButtons } from './SafeSignExecuteButtons';
import { Address, Hash, Hex, hexToString, TransactionRequestBase } from 'viem';
import { useSafeTxInfo } from './hooks/useSafeTxInfo';

import { getSafeTransactionHash } from '@/helpers/safe';
import { SafeDefinition } from '@/helpers/store';
import { CannonSafeTransaction } from '@/hooks/backend';
import { SafeTransaction } from '@/types/SafeTransaction';
import { ChainDefinition } from '@usecannon/builder';
import { getChainDefinitionFromWorker } from '@/helpers/chain-definition';

import 'react-diff-view/style/index.css';

function getPrevDeployGitHash({
  queuedWithGitOps,
  prevGitRepoHash,
  gitRepoHash,
  prevDeployHashQuery,
}: {
  queuedWithGitOps: boolean;
  prevGitRepoHash?: string;
  gitRepoHash?: string;
  prevDeployHashQuery?: Hash;
}): string {
  if (!prevGitRepoHash || !gitRepoHash) return '';

  if (queuedWithGitOps) {
    return (prevGitRepoHash || gitRepoHash) ?? '';
  }

  return prevDeployHashQuery && prevDeployHashQuery.data?.[0].result
    ? prevDeployHashQuery.data[0].result.slice(2)
    : gitRepoHash ?? '';
}

function getIpfsUrl(packageUrl?: string) {
  if (!packageUrl) return '';

  // Get the last segment of the URL and construct IPFS URL
  const lastSegment = _.last(packageUrl.split('/'));
  return lastSegment ? `ipfs://${lastSegment}` : '';
}

function TransactionDetailsPage() {
  const walletChainId = useChainId();
  const account = useAccount();
  const gitDiffContainerRef = useRef<HTMLDivElement>(null);

  // ---------------------
  // Get safe info
  // ---------------------
  const {
    chainId: txParamChainId,
    nonce: txParamNonce,
    sigHash: txParamSignatureHash,
    safeDefinition: txParamSafeDefinition,
  } = useTransactionDetailsParams();

  const { getChainById } = useCannonChains();
  if (!getChainById(txParamSafeDefinition.chainId)) {
    throw new Error('Safe Chain not supported');
  }

  const { status, transaction, safeData, packageInfo, gitInfo, management } =
    useSafeTxInfo(
      txParamSafeDefinition,
      txParamSignatureHash,
      txParamNonce,
      txParamChainId
    );

  const safeTxn = transaction.safeTxn;
  const parsedMulticallData = transaction.parsedMulticallData;
  const queuedWithGitOps = transaction.queuedWithGitOps;

  const cannonPackage = packageInfo.cannonPackage;

  const prevDeployHashQuery = gitInfo.prevDeployHashQuery;

  // Derived state

  const isTransactionExecuted = status.isTransactionExecuted;
  const stager = management.stager;
  const signers: Address[] = stager.existingSigners.length
    ? stager.existingSigners
    : safeTxn?.confirmedSigners || [];
  const unorderedNonce =
    safeTxn && safeTxn._nonce > safeData.safeStagedTxs[0]?.txn._nonce;
  const threshold =
    Number(stager.requiredSigners) || safeTxn?.confirmationsRequired || 0;

  const prevDeployPackageUrl = prevDeployHashQuery.data
    ? hexToString(prevDeployHashQuery.data[1].result || '0x')
    : '';

  const buildInfo = useCannonBuild(txParamSafeDefinition);

  // compare proposed build info with expected transaction batch
  const expectedTxns = buildInfo.buildState?.result?.safeSteps?.map(
    (s) => s.tx as unknown as Partial<TransactionRequestBase>
  );
  const unequalTransaction = Boolean(
    expectedTxns &&
      (parsedMulticallData?.txns.length !== expectedTxns.length ||
        parsedMulticallData?.txns.find((t, i) => {
          return (
            t.to.toLowerCase() !== expectedTxns[i].to?.toLowerCase() ||
            t.data !== expectedTxns[i].data ||
            t.value.toString() !== expectedTxns[i].value?.toString()
          );
        }))
  );

  //----------------
  // BUILD STUFF
  //----------------

  // // git stuff
  // const denom = parsedMulticallData?.gitRepoUrl?.lastIndexOf(':');

  // const gitUrl = parsedMulticallData?.gitRepoUrl?.slice(0, denom);
  // const gitFile = parsedMulticallData?.gitRepoUrl?.slice((denom ?? 0) + 1);

  // const chainDefinitionRef = useRef<ChainDefinition>();

  // const prevDeployGitHash = getPrevDeployGitHash({
  //   queuedWithGitOps,
  //   prevGitRepoHash: parsedMulticallData?.gitRepoHash,
  //   gitRepoHash: parsedMulticallData?.gitRepoHash,
  //   prevDeployHashQuery: prevDeployHashQuery.data?.[0].result,
  // });

  // const cannonPackageUrl = getIpfsUrl(
  //   parsedMulticallData?.cannonUpgradeFromPackage || prevDeployPackageUrl
  // );

  // const prevCannonDeployInfo = useCannonPackage(cannonPackageUrl);

  // const cannonDefInfo = useLoadCannonDefinition(
  //   gitUrl ?? '',
  //   parsedMulticallData?.gitRepoHash ?? '',
  //   gitFile ?? ''
  // );

  // useEffect(() => {
  //   const getChainDef = async () => {
  //     if (!cannonDefInfo.def) return;

  //     chainDefinitionRef.current = await getChainDefinitionFromWorker(
  //       cannonDefInfo.def
  //     );
  //   };

  //   void getChainDef();
  // }, [cannonDefInfo.def]);

  // useEffect(() => {
  //   if (
  //     !txParamSafeDefinition ||
  //     !chainDefinitionRef.current ||
  //     !prevCannonDeployInfo.ipfsQuery.data?.deployInfo
  //   ) {
  //     return;
  //   }

  //   buildInfo.doBuild(
  //     chainDefinitionRef.current,
  //     prevCannonDeployInfo.ipfsQuery.data?.deployInfo
  //   );
  // }, [
  //   !isTransactionExecuted &&
  //     (!prevDeployGitHash || prevCannonDeployInfo.ipfsQuery.isFetched),
  //   chainDefinitionRef.current,
  // ]);

  if (!parsedMulticallData) {
    return (
      <div className="container p-24 text-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (!safeTxn && status.isFetched) {
    return (
      <div className="container">
        <p>
          Transaction not found! Current safe nonce:{' '}
          {safeData.safeNonce ? safeData.safeNonce.toString() : 'none'}, Highest
          Staged Nonce:{' '}
          {(
            _.last(safeData.safeStagedTxs)?.txn._nonce || safeData.safeNonce
          ).toString()}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-full mb-6">
      <div className="px-4 py-[24px] lg:py-[48px] border-b border-border">
        <div className="container max-w-[1024px]">
          <h1 className="text-2xl lg:text-3xl font-bold">
            Transaction #{txParamNonce}
          </h1>
          {(parsedMulticallData.type == 'deploy' ||
            parsedMulticallData.type == 'invoke') && (
            <div className="mt-4">
              <TransactionStepper
                chainId={txParamChainId}
                cannonPackage={cannonPackage}
                safeTxn={safeTxn}
                published={status.published}
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
              safe={txParamSafeDefinition}
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
                        parsedMulticallData.cannonUpgradeFromPackage !==
                          prevDeployPackageUrl
                    )}
                    safeSigner={signers[0]}
                    safe={txParamSafeDefinition}
                    safeTxn={safeTxn}
                    execTransactionData={stager.execTransactionData}
                  />
                )}

                {/* Signatures or Execute info  */}
                <SafeSignExecuteButtons
                  safe={txParamSafeDefinition}
                  safeTxn={safeTxn}
                  stager={stager}
                  staged={safeData.safeStagedTxs}
                  signers={signers}
                  threshold={threshold}
                  isTransactionExecuted={isTransactionExecuted}
                  unorderedNonce={unorderedNonce}
                  walletChainId={walletChainId}
                  accountConnected={account.isConnected}
                  refetchSafeTxs={management.refetchSafeTxs}
                  refetchHistory={management.refetchHistory}
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
                        deployUrl={parsedMulticallData.cannonPackage}
                        targetChainId={txParamSafeDefinition.chainId}
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
