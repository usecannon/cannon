'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { X, Info } from 'lucide-react';
import React from 'react';
import { SimulateTransactionButton } from './SimulateTransactionButton';
import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';

type Props = {
  queuedWithGitOps: boolean;
  buildMessage?: string;
  buildError?: string | null;
  buildCompleted: boolean;
  unequalTransaction: boolean;
  showPrevDeployWarning: boolean;
  safeSigner: string;
  safe: SafeDefinition;
  safeTxn: SafeTransaction | null;
  execTransactionData?: string;
};

export default function SimulateSafeTx({
  queuedWithGitOps,
  buildMessage,
  buildError,
  buildCompleted,
  unequalTransaction,
  showPrevDeployWarning,
  safeSigner,
  safe,
  safeTxn,
  execTransactionData,
}: Props) {
  return (
    <Card className="rounded-sm">
      <CardHeader className="pb-3">
        <CardTitle>Verify Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {queuedWithGitOps && (
          <div>
            {buildMessage && <p className="text-sm mb-2">{buildMessage}</p>}
            {buildError && <p className="text-sm mb-2">{buildError}</p>}
            {buildCompleted && !unequalTransaction && (
              <p className="text-sm mb-2">
                The transactions queued to the Safe match the Git Target
              </p>
            )}
            {buildCompleted && unequalTransaction && (
              <p className="text-sm mb-2">
                <X className="inline-block mr-1" />
                Proposed transactions do not match git diff. Could be an attack.
              </p>
            )}
            {showPrevDeployWarning && (
              <div className="flex items-start text-xs font-medium">
                <Info className="mt-0.5 mr-1.5" />
                The previous deploy hash does not derive from an onchain record.
              </div>
            )}
          </div>
        )}

        <p className="text-sm">
          Confirm you’re accessing the page via the <code>usecannon.com</code>{' '}
          domain,{' '}
          <SimulateTransactionButton
            signer={safeSigner}
            safe={safe}
            safeTxn={safeTxn}
            execTransactionData={execTransactionData}
          />
          , and always verify the transaction data displayed in your wallet with{' '}
          <a
            href="https://github.com/usecannon/safe-tx-hashes-util"
            className="underline"
            target="_blank"
          >
            this tool
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}
