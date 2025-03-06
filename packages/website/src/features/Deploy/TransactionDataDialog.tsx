import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';

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
        <Button variant="link" className="p-0 h-auto font-normal underline">
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Transaction Data Verification</DialogTitle>
          <DialogDescription>
            Verify your transaction data before signing to ensure security. Copy
            this data to verify with external tools.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Safe Address:</h3>
            <div className="bg-secondary p-2 rounded-md overflow-x-auto">
              <code className="text-xs break-all">{safe.address}</code>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-1">Chain ID:</h3>
            <div className="bg-secondary p-2 rounded-md">
              <code className="text-xs">{safe.chainId}</code>
            </div>
          </div>

          {execTransactionData && (
            <div>
              <h3 className="text-sm font-medium mb-1">Transaction Data:</h3>
              <div className="bg-secondary p-2 rounded-md overflow-x-auto">
                <code className="text-xs break-all">{execTransactionData}</code>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() =>
                  navigator.clipboard.writeText(execTransactionData)
                }
              >
                Copy Transaction Data
              </Button>
            </div>
          )}

          <div className="pt-2 text-sm">
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
