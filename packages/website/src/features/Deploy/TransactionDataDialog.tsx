import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { Input } from '@/components/ui/input';
import { ClipboardButton } from '@/components/ClipboardButton';

interface TransactionDataDialogProps {
  safeTxn: SafeTransaction | null;
  safe: SafeDefinition;
  execTransactionData?: string;
  children: React.ReactNode;
}

export function TransactionDataDialog({
  safeTxn,
  safe,
  execTransactionData,
  children,
}: TransactionDataDialogProps) {
  if (!safeTxn) return <>{children}</>; // If no transaction, just render children

  return (
    <Dialog>
      <DialogTrigger asChild>
        <span className="underline cursor-pointer text-primary">
          {children}
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Transaction Data Verification</DialogTitle>
          <DialogDescription>
            Verify your transaction data before signing. Copy this data to
            verify with external tools.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Safe Address</h3>
            <div className="relative">
              <Input
                readOnly
                value={safe.address}
                className="text-xs break-all font-mono pr-10"
              />
              <ClipboardButton
                text={safe.address}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              />
            </div>
          </div>

          {safeTxn && (
            <div>
              <h3 className="text-sm font-medium mb-1">To Address</h3>
              <div className="relative">
                <Input
                  readOnly
                  value={safeTxn.to}
                  className="text-xs break-all font-mono pr-10"
                />
                <ClipboardButton
                  text={safeTxn.to}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                />
              </div>
            </div>
          )}

          {safeTxn && (
            <div>
              <h3 className="text-sm font-medium mb-1">Safe Transaction Gas</h3>
              <div className="relative">
                <Input
                  readOnly
                  value={String(safeTxn.safeTxGas)}
                  className="text-xs break-all font-mono pr-10"
                />
                <ClipboardButton
                  text={String(safeTxn.safeTxGas)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                />
              </div>
            </div>
          )}

          {safeTxn && (
            <div>
              <h3 className="text-sm font-medium mb-1">Refund Receiver</h3>
              <div className="relative">
                <Input
                  readOnly
                  value={safeTxn.refundReceiver}
                  className="text-xs break-all font-mono pr-10"
                />
                <ClipboardButton
                  text={safeTxn.refundReceiver}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                />
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium mb-1">Chain ID</h3>
            <div className="relative">
              <Input
                readOnly
                value={String(safe.chainId)}
                className="text-xs font-mono pr-10"
              />
              <ClipboardButton
                text={String(safe.chainId)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              />
            </div>
          </div>

          {execTransactionData && (
            <div>
              <h3 className="text-sm font-medium mb-1">Transaction Data</h3>
              <div className="relative">
                <Input
                  readOnly
                  value={execTransactionData}
                  className="text-xs break-all font-mono pr-10"
                />
                <ClipboardButton
                  text={execTransactionData}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                />
              </div>
            </div>
          )}

          {safeTxn && (
            <div>
              <h3 className="text-sm font-medium mb-1">Transaction Value</h3>
              <div className="relative">
                <Input
                  readOnly
                  value={safeTxn.value}
                  className="text-xs break-all font-mono pr-10"
                />
                <ClipboardButton
                  text={safeTxn.value}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <p>
              Use the{' '}
              <a
                href="https://github.com/usecannon/safe-tx-hashes-util"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                safe-tx-hashes-util
              </a>{' '}
              tool to validate this transaction.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TransactionDataDialog;
