'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { useTransactionDetailsParams } from '@/hooks/routing/useTransactionDetailsParams';

import { useCannonChains } from '@/providers/CannonProvidersProvider';

import _ from 'lodash';
import React, { useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';
import PublishUtility from './PublishUtility';
import { TransactionDisplay } from './TransactionDisplay';
import { TransactionStepper } from './TransactionStepper';
import SimulateSafeTx from '@/features/Deploy/SimulateSafeTx';
import { SafeSignExecuteButtons } from './SafeSignExecuteButtons';
import { Address, hexToString, TransactionRequestBase } from 'viem';
import { useSafeTxInfo } from './hooks/useSafeTxInfo';
import { useSafeBuildTx } from '@/features/Deploy/hooks/useSafeBuildTx';

import 'react-diff-view/style/index.css';

function TransactionDetailsPage() {
  const walletChainId = useChainId();
  const account = useAccount();
  const gitDiffContainerRef = useRef<HTMLDivElement>(null);

  // get transaction details from url params
  const {
    chainId: txParamChainId,
    nonce: txParamNonce,
    sigHash: txParamSignatureHash,
    safeDefinition: txParamSafeDefinition,
  } = useTransactionDetailsParams();

  // check if safe chain is supported
  const { getChainById } = useCannonChains();
  if (!getChainById(txParamSafeDefinition.chainId)) {
    throw new Error('Safe Chain not supported');
  }

  const { transaction, safeData, packageInfo } = useSafeTxInfo(
    txParamSafeDefinition,
    txParamSignatureHash,
    txParamNonce,
    txParamChainId
  );

  const { buildInfo } = useSafeBuildTx({
    safeDefinition: txParamSafeDefinition,
    isTransactionExecuted: transaction.isExecuted,
    parsedMulticallData: transaction.parsedMulticallData,
    prevDeployHashQuery: packageInfo.prevDeployHashQuery,
    queuedWithGitOps: transaction.queuedWithGitOps,
  });

  // Derived state
  const signers: Address[] = safeData.stager.existingSigners.length
    ? safeData.stager.existingSigners
    : transaction.safeTxn?.confirmedSigners || [];

  const unorderedNonce =
    transaction.safeTxn &&
    transaction.safeTxn._nonce > safeData.stagedTxs.txs[0]?.txn._nonce;

  const threshold =
    Number(safeData.stager.requiredSigners) ||
    transaction.safeTxn?.confirmationsRequired ||
    0;

  const prevDeployPackageUrl = packageInfo.prevDeployHashQuery.data
    ? hexToString(packageInfo.prevDeployHashQuery.data[1].result || '0x')
    : '';

  // compare proposed build info with expected transaction batch
  const expectedTxns = buildInfo.buildState?.result?.safeSteps?.map(
    (s) => s.tx as unknown as Partial<TransactionRequestBase>
  );

  const unequalTransaction = Boolean(
    expectedTxns &&
      (transaction.parsedMulticallData?.txns.length !== expectedTxns.length ||
        transaction.parsedMulticallData?.txns.find((t, i) => {
          return (
            t.to.toLowerCase() !== expectedTxns[i].to?.toLowerCase() ||
            t.data !== expectedTxns[i].data ||
            t.value.toString() !== expectedTxns[i].value?.toString()
          );
        }))
  );

  if (!transaction.parsedMulticallData) {
    return (
      <div className="container p-24 text-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (!transaction.safeTxn && safeData.stagedTxs.isFetched) {
    return (
      <div className="container">
        <p>
          Transaction not found! Current safe nonce:{' '}
          {transaction.safeNonce ? transaction.safeNonce.toString() : 'none'},
          Highest Staged Nonce:{' '}
          {(
            _.last(safeData.stagedTxs.txs)?.txn._nonce || transaction.safeNonce
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
          {(transaction.parsedMulticallData.type == 'deploy' ||
            transaction.parsedMulticallData.type == 'invoke') && (
            <div className="mt-4">
              <TransactionStepper
                chainId={txParamChainId}
                cannonPackage={packageInfo.cannonPackage}
                safeTxn={transaction.safeTxn}
                published={packageInfo.isPublished}
                publishable={transaction.queuedWithGitOps}
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
              safeTxn={transaction.safeTxn as any}
              queuedWithGitOps={transaction.queuedWithGitOps}
              showQueueSource={true}
              isTransactionExecuted={transaction.isExecuted}
              containerRef={gitDiffContainerRef}
            />
          </div>

          {/* Tx extra data: right column */}
          <div>
            <div className="h-full">
              <div className="flex flex-col gap-4">
                {/* Verify txs */}
                {!transaction.isExecuted && !unorderedNonce && (
                  <SimulateSafeTx
                    queuedWithGitOps={transaction.queuedWithGitOps}
                    buildMessage={buildInfo.buildState?.message}
                    buildError={buildInfo.buildState?.error}
                    buildCompleted={Boolean(buildInfo.buildState?.result)}
                    unequalTransaction={unequalTransaction}
                    showPrevDeployWarning={Boolean(
                      prevDeployPackageUrl &&
                        transaction.parsedMulticallData
                          .cannonUpgradeFromPackage !== prevDeployPackageUrl
                    )}
                    safeSigner={signers[0]}
                    safe={txParamSafeDefinition}
                    safeTxn={transaction.safeTxn}
                    execTransactionData={safeData.stager.execTransactionData}
                  />
                )}

                {/* Signatures or Execute info  */}
                <SafeSignExecuteButtons
                  safe={txParamSafeDefinition}
                  safeTxn={transaction.safeTxn}
                  stager={safeData.stager}
                  staged={safeData.stagedTxs.txs}
                  signers={signers}
                  threshold={threshold}
                  isTransactionExecuted={transaction.isExecuted}
                  unorderedNonce={unorderedNonce}
                  walletChainId={walletChainId}
                  accountConnected={account.isConnected}
                  refetchSafeTxs={safeData.stagedTxs.refetch}
                  refetchHistory={safeData.historyTxs.refetch}
                />

                {/* Cannon package IPFS Info */}
                {transaction.queuedWithGitOps && transaction.isExecuted && (
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
                        deployUrl={
                          transaction.parsedMulticallData.cannonPackage
                        }
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
