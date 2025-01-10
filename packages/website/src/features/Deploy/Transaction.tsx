import React, { useMemo } from 'react';
import { useCannonPackage } from '@/hooks/cannon';
import NextLink from 'next/link';
import { getSafeUrl } from '@/hooks/safe';
import { SafeDefinition } from '@/helpers/store';
import { SafeTransaction } from '@/types/SafeTransaction';
import { parseHintedMulticall } from '@/helpers/cannon';
import { getSafeTransactionHash } from '@/helpers/safe';
import { useTxnStager } from '@/hooks/backend';
import { GitHub } from 'react-feather';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Params {
  safe: SafeDefinition;
  tx: SafeTransaction;
  hideExternal: boolean;
  isStaged?: boolean;
}

const useTxnAdditionalData = ({
  safe,
  tx,
  isStaged,
}: {
  safe: SafeDefinition;
  tx: SafeTransaction;
  isStaged?: boolean;
}) => {
  const useTxnData = isStaged ? useTxnStager : () => ({});
  return useTxnData(tx, { safe: safe }) as any;
};

// Note: If signatures is provided, additional data will be fetched
export function Transaction({ safe, tx, hideExternal, isStaged }: Params) {
  const stager = useTxnAdditionalData({ safe, tx, isStaged });
  const hintData = parseHintedMulticall(tx.data);

  // get the package referenced by this ipfs package
  const { resolvedName, resolvedVersion, resolvedPreset } = useCannonPackage(
    hintData?.cannonPackage
  );

  const sigHash = useMemo(
    () => hintData && getSafeTransactionHash(safe, tx),
    [safe, tx]
  );

  const isLink = sigHash != null;

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (isLink) {
      return (
        <NextLink
          href={`/deploy/txn/${safe.chainId}/${safe.address}/${tx._nonce}/${sigHash}`}
        >
          {children}
        </NextLink>
      );
    }
    return (
      <a
        href={`${getSafeUrl(safe, '/transactions/tx')}&id=${tx.safeTxHash}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  };

  return (
    <Wrapper>
      <div
        className={cn(
          'mb-4 p-4 border border-border bg-card rounded-md transition-all hover:bg-accent/50 cursor-pointer',
          hideExternal && !isLink ? 'hidden' : 'flex'
        )}
      >
        <div className="flex items-center gap-5 w-full">
          {hintData?.type === 'deploy' ? (
            <GitHub size="24" strokeWidth={1} />
          ) : hintData?.type === 'invoke' ? (
            <img
              alt="Cannon Logomark"
              height="24"
              width="24"
              src="/images/cannon-logomark.svg"
            />
          ) : (
            <img
              alt="Safe Logomark"
              height="24"
              width="24"
              src="/images/safe-logomark.svg"
            />
          )}
          <h3 className="text-lg font-semibold inline-block min-w-[40px]">
            #{tx._nonce}
          </h3>
          {hintData?.cannonPackage ? (
            <>
              {hintData.isSinglePackage &&
                (!resolvedName ? (
                  <div className="animate-spin h-4 w-4 border-2 border-border border-t-foreground rounded-full opacity-80" />
                ) : (
                  <p className="text-muted-foreground">
                    {isStaged
                      ? hintData.type == 'deploy'
                        ? 'Building '
                        : 'Staged with '
                      : hintData.type == 'deploy'
                      ? 'Built '
                      : 'Executed with '}
                    {`${resolvedName}:${resolvedVersion}@${resolvedPreset}`}
                  </p>
                ))}
            </>
          ) : (
            <p className="text-muted-foreground">Executed without Cannon</p>
          )}

          <div className="flex items-center ml-auto">
            {isStaged && Object.keys(stager).length && (
              <p className="text-muted-foreground">
                {stager.existingSigners.length} of{' '}
                {stager.requiredSigners.toString()} signed
              </p>
            )}
            <div className="pl-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.preventDefault()}
              >
                {isLink ? (
                  <ChevronRight className="h-8 w-8" />
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
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
