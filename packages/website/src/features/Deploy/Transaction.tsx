import React, { useMemo } from 'react';
import { useCannonPackage } from '@/hooks/cannon';
import NextLink from 'next/link';
import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { parseHintedMulticall } from '@/helpers/cannon';
import { getSafeTransactionHash } from '@/helpers/safe';
import { useTxnStager } from '@/hooks/backend';
import { GitHub } from 'react-feather';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSafeUrl } from '@/hooks/safe';

const useTxnAdditionalData = ({
  safe,
  tx,
  isStaged,
}: {
  safe: SafeDefinition;
  tx: SafeTransaction;
  isStaged?: boolean;
}) => {
  const useTxnData = isStaged
    ? useTxnStager
    : () => ({
        existingSigners: tx.confirmedSigners || [],
        requiredSigners: tx.confirmationsRequired || 0,
      });
  return useTxnData(tx, { safe: safe }) as any;
};

interface TransactionTableProps {
  transactions: SafeTransaction[];
  safe: SafeDefinition;
  hideExternal: boolean;
  isStaged?: boolean;
}

export function TransactionTable({
  transactions,
  safe,
  hideExternal,
  isStaged,
}: TransactionTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[1px]"></TableHead>
          <TableHead>Nonce</TableHead>
          <TableHead>Package Name</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Preset</TableHead>
          {isStaged && <TableHead>Signers</TableHead>}
          <TableHead className="w-[1px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TransactionRow
            key={isStaged ? JSON.stringify(tx) : tx.safeTxHash}
            safe={safe}
            tx={tx}
            hideExternal={hideExternal}
            isStaged={isStaged}
          />
        ))}
      </TableBody>
    </Table>
  );
}

interface TransactionRowProps {
  safe: SafeDefinition;
  tx: SafeTransaction;
  hideExternal: boolean;
  isStaged?: boolean;
}

function TransactionRow({
  safe,
  tx,
  hideExternal,
  isStaged,
}: TransactionRowProps) {
  const stager = useTxnAdditionalData({ safe, tx, isStaged });
  const hintData = parseHintedMulticall(tx.data);
  const getSafeUrl = useSafeUrl();

  const { resolvedName, resolvedVersion, resolvedPreset } = useCannonPackage(
    hintData?.cannonPackage
  );

  const sigHash = useMemo(
    () => hintData && getSafeTransactionHash(safe, tx),
    [safe, tx]
  );

  const isLink = sigHash != null;

  if (hideExternal && !isLink) {
    return null;
  }

  return (
    <TableRow
      className="group cursor-pointer hover:bg-accent/50"
      data-testid={`txn-list-row-${tx._nonce}`}
    >
      <TableCell className="relative px-6 w-[1px]">
        {isLink ? (
          <NextLink
            className="absolute inset-0 z-10 block"
            href={`/deploy/txn/${safe.chainId}/${safe.address}/${tx._nonce}/${sigHash}`}
          />
        ) : (
          <a
            href={`${getSafeUrl(safe, '/transactions/tx')}&id=${tx.safeTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-10 block"
          />
        )}
        <div className="relative z-1">
          {hintData?.type === 'deploy' ? (
            <GitHub size="20" strokeWidth={1} />
          ) : hintData?.type === 'invoke' ? (
            <img
              alt="Cannon"
              height="20"
              width="20"
              src="/images/logomark.svg"
            />
          ) : (
            <img
              alt="Safe"
              height="20"
              width="20"
              src="/images/safe-logomark.svg"
            />
          )}
        </div>
      </TableCell>
      <TableCell className="relative font-medium">
        {isLink ? (
          <NextLink
            className="absolute inset-0 z-10 block"
            href={`/deploy/txn/${safe.chainId}/${safe.address}/${tx._nonce}/${sigHash}`}
          />
        ) : (
          <a
            href={`${getSafeUrl(safe, '/transactions/tx')}&id=${tx.safeTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-10 block"
          />
        )}
        <div className="relative z-1">#{tx._nonce}</div>
      </TableCell>
      <TableCell className="relative">
        {isLink ? (
          <NextLink
            className="absolute inset-0 z-10 block"
            href={`/deploy/txn/${safe.chainId}/${safe.address}/${tx._nonce}/${sigHash}`}
          />
        ) : (
          <a
            href={`${getSafeUrl(safe, '/transactions/tx')}&id=${tx.safeTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-10 block"
          />
        )}
        <div className="relative z-1">
          {hintData?.cannonPackage ? (
            <>
              {hintData.isSinglePackage &&
                (!resolvedName ? (
                  <div className="animate-spin h-4 w-4 border-2 border-border border-t-foreground rounded-full opacity-80" />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {resolvedName}
                  </span>
                ))}
            </>
          ) : (
            <span className="text-sm text-muted-foreground/50">N/A</span>
          )}
        </div>
      </TableCell>
      <TableCell className="relative">
        {isLink ? (
          <NextLink
            className="absolute inset-0 z-10 block"
            href={`/deploy/txn/${safe.chainId}/${safe.address}/${tx._nonce}/${sigHash}`}
          />
        ) : (
          <a
            href={`${getSafeUrl(safe, '/transactions/tx')}&id=${tx.safeTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-10 block"
          />
        )}
        <div className="relative z-1">
          {hintData?.cannonPackage ? (
            <>
              {hintData.isSinglePackage &&
                (!resolvedName ? (
                  <div className="animate-spin h-4 w-4 border-2 border-border border-t-foreground rounded-full opacity-80" />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {resolvedVersion}
                  </span>
                ))}
            </>
          ) : (
            <span className="text-sm text-muted-foreground/50">N/A</span>
          )}
        </div>
      </TableCell>
      <TableCell className="relative">
        {isLink ? (
          <NextLink
            className="absolute inset-0 z-10 block"
            href={`/deploy/txn/${safe.chainId}/${safe.address}/${tx._nonce}/${sigHash}`}
          />
        ) : (
          <a
            href={`${getSafeUrl(safe, '/transactions/tx')}&id=${tx.safeTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-10 block"
          />
        )}
        <div className="relative z-1">
          {hintData?.cannonPackage ? (
            <>
              {hintData.isSinglePackage &&
                (!resolvedName ? (
                  <div className="animate-spin h-4 w-4 border-2 border-border border-t-foreground rounded-full opacity-80" />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {resolvedPreset}
                  </span>
                ))}
            </>
          ) : (
            <span className="text-sm text-muted-foreground/50">N/A</span>
          )}
        </div>
      </TableCell>
      {isStaged && (
        <TableCell className="relative">
          {isLink ? (
            <NextLink
              className="absolute inset-0 z-10 block"
              href={`/deploy/txn/${safe.chainId}/${safe.address}/${tx._nonce}/${sigHash}`}
            />
          ) : (
            <a
              href={`${getSafeUrl(safe, '/transactions/tx')}&id=${
                tx.safeTxHash
              }`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 z-10 block"
            />
          )}
          <div className="relative z-1">
            {isStaged && Object.keys(stager).length && (
              <span className="text-sm text-muted-foreground">
                {stager.existingSigners.length} of{' '}
                {stager.requiredSigners.toString()} signed
              </span>
            )}
          </div>
        </TableCell>
      )}
      <TableCell className="relative w-[1px]">
        {isLink ? (
          <NextLink
            className="absolute inset-0 z-10 block"
            href={`/deploy/txn/${safe.chainId}/${safe.address}/${tx._nonce}/${sigHash}`}
          />
        ) : (
          <a
            href={`${getSafeUrl(safe, '/transactions/tx')}&id=${tx.safeTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-10 block"
          />
        )}
        <div className="relative z-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => e.preventDefault()}
          >
            {isLink ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            <span className="sr-only">
              {isLink
                ? 'View Transaction Details'
                : `View Transaction #${tx._nonce}`}
            </span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
