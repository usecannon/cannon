import { RefObject, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CustomSpinner } from '@/components/CustomSpinner';
import { parseHintedMulticall } from '@/helpers/cannon';
import { SafeDefinition } from '@/helpers/store';
import {
  useCannonPackageContracts,
  useLoadCannonDefinition,
} from '@/hooks/cannon';
import { useGitDiff } from '@/hooks/git';
import { useGetPreviousGitInfoQuery } from '@/hooks/safe';
import { SafeTransaction } from '@/types/SafeTransaction';
import { cn } from '@/lib/utils';
import { Diff, parseDiff, Hunk } from 'react-diff-view';
import { DisplayedTransaction } from './DisplayedTransaction';
import Link from 'next/link';
import { IoIosContract, IoIosExpand } from 'react-icons/io';
import {
  Card,
  CardTitle,
  CardHeader,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

// Add diff styles
const diffStyles = `
.diff-gutter-delete, .diff-code-delete { background: #63171b; }
.diff-gutter-insert, .diff-code-insert { background: #1c4532; }
`;

const CommitLink = ({ gitUrl, hash }: { gitUrl?: string; hash?: string }) => {
  if (!gitUrl || !hash) return null;

  return (
    <p className="text-xs text-muted-foreground">
      Commit Hash:{' '}
      <Link
        className="font-mono border-b border-dotted border-gray-300 hover:no-underline"
        href={`${gitUrl}/commit/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {hash}
      </Link>
    </p>
  );
};

const parseDiffFileNames = (diffString: string): string[] => {
  const regExp = /[-|+]{3}\s[ab]\/\.(.*?)\n/g;
  let match;
  const fileNames: string[] = [];
  while ((match = regExp.exec(diffString)) !== null) {
    fileNames.push(match[1]);
  }
  return fileNames;
};

const NoDiffWarning = () => (
  <Alert variant="info" className="mb-4">
    <AlertDescription>
      <strong>No cannonfile diff available.</strong> This may occur when signing
      an initial deployment, changing Safes used for deployments, changing
      package names for the deployment, or re-executing the same partial
      deployment more than once.
    </AlertDescription>
  </Alert>
);

export function TransactionDisplay(props: {
  safeTxn: SafeTransaction;
  safe: SafeDefinition;
  queuedWithGitOps?: boolean;
  showQueueSource?: boolean;
  isTransactionExecuted?: boolean;
  containerRef?: RefObject<HTMLDivElement>;
}) {
  const [expandDiff, setExpandDiff] = useState<boolean>(false);

  const hintData = parseHintedMulticall(props.safeTxn?.data);

  const cannonInfo = useCannonPackageContracts(hintData?.cannonPackage);

  // git stuff
  const denom = hintData?.gitRepoUrl?.lastIndexOf(':');
  const gitUrl = hintData?.gitRepoUrl?.slice(0, denom);
  const gitFile = hintData?.gitRepoUrl?.slice((denom ?? 0) + 1);

  const prevDeployHashQuery = useGetPreviousGitInfoQuery(
    props.safe,
    hintData?.gitRepoUrl ?? ''
  );

  // Determine whether we should use the hint data or the previous git info query
  let prevDeployGitHash: string = hintData?.prevGitRepoHash ?? '';
  if (
    props.queuedWithGitOps &&
    !props.isTransactionExecuted &&
    prevDeployHashQuery.data?.length &&
    prevDeployHashQuery.data[0].result &&
    ((prevDeployHashQuery.data[0].result as any).length as number) > 2
  ) {
    prevDeployGitHash = (prevDeployHashQuery.data[0].result as any).slice(
      2
    ) as any;
  }

  const cannonDefInfo = useLoadCannonDefinition(
    gitUrl ?? '',
    hintData?.gitRepoHash ?? '',
    gitFile ?? ''
  );

  const {
    patches,
    isLoading: isGitDiffLoading,
    areDiff,
  } = useGitDiff(
    gitUrl ?? '',
    prevDeployGitHash,
    hintData?.gitRepoHash ?? '',
    cannonDefInfo.filesList ? Array.from(cannonDefInfo.filesList) : []
  );

  // This is just needed for single package transactions
  if (
    hintData?.cannonPackage &&
    !cannonInfo.contracts &&
    hintData.isSinglePackage
  ) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CustomSpinner />
        <p className="text-sm text-muted-foreground mt-4">
          Parsing transaction data...
        </p>
      </div>
    );
  }

  if (!hintData) {
    return <Alert variant="info">Could not parse the transaction.</Alert>;
  }

  return (
    <div className="max-w-full overflow-x-auto">
      <style>{diffStyles}</style>
      {/* Code diff */}
      {props.showQueueSource && props.queuedWithGitOps && (
        <Card
          className={cn(
            expandDiff ? 'fixed inset-0 z-[99] mb-0' : 'mb-4',
            'bg-background rounded-sm'
          )}
        >
          <div
            className={cn(
              'h-full overflow-y-auto',
              expandDiff ? '' : 'max-h-[356px]'
            )}
          >
            <CardHeader className="relative">
              <CardTitle>Cannonfile Diff</CardTitle>
              <CardDescription>
                {isGitDiffLoading ? (
                  'Loading diff...'
                ) : (
                  <>
                    Queued from{' '}
                    <Link
                      href={gitUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                    >
                      {gitUrl}
                    </Link>
                  </>
                )}
              </CardDescription>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setExpandDiff(!expandDiff)}
                      className="absolute top-4 right-5 hover:text-gray-300"
                    >
                      {expandDiff ? <IoIosContract /> : <IoIosExpand />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{expandDiff ? 'Collapse' : 'Expand'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>

            <CardContent>
              {isGitDiffLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <>
                  {prevDeployGitHash == '' && <NoDiffWarning />}
                  <div className="dark">
                    {/* Commit hashes */}
                    <div className="flex pb-1">
                      {areDiff && (
                        <div className="w-1/2 pb-1">
                          <CommitLink
                            gitUrl={gitUrl!}
                            hash={prevDeployGitHash}
                          />
                        </div>
                      )}
                      <div className="w-1/2 pb-1">
                        <CommitLink
                          gitUrl={gitUrl!}
                          hash={hintData.gitRepoHash}
                        />
                      </div>
                    </div>

                    {/* package code */}
                    {patches.map((p, i) => {
                      const { oldRevision, newRevision, type, hunks } =
                        parseDiff(p)[0];
                      const [fromFileName, toFileName] = parseDiffFileNames(p);

                      return (
                        hunks.length > 0 && (
                          <div
                            className="mb-2 overflow-hidden rounded-sm bg-accent/50 text-xs"
                            key={i}
                          >
                            <div className="flex flex-row bg-black/30 py-1 font-mono">
                              {areDiff && (
                                <div className="w-1/2 px-2 py-1">
                                  {fromFileName}
                                </div>
                              )}
                              <div
                                className={cn(
                                  'px-2 py-1',
                                  areDiff ? 'w-1/2' : 'w-full'
                                )}
                              >
                                {areDiff ? toFileName : fromFileName}
                              </div>
                            </div>
                            <Diff
                              key={oldRevision + '-' + newRevision}
                              viewType={areDiff ? 'split' : 'unified'}
                              diffType={type}
                              hunks={hunks}
                            >
                              {(hunks) =>
                                hunks.map((hunk) => (
                                  <Hunk key={hunk.content} hunk={hunk} />
                                ))
                              }
                            </Diff>
                          </div>
                        )
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </div>
        </Card>
      )}

      {/* Queued from */}
      {props.showQueueSource && !props.queuedWithGitOps && (
        <p className="mb-4 text-lg text-muted-foreground">
          {!hintData.cannonPackage ? (
            <>These transactions were queued without a source package.</>
          ) : hintData.isSinglePackage ? (
            <>
              These transactions were queued using{' '}
              <Link
                href={`/packages/${cannonInfo.resolvedName}/${cannonInfo.resolvedVersion}/${props.safe.chainId}-${cannonInfo.resolvedPreset}`}
                className="underline hover:no-underline"
              >
                {cannonInfo.resolvedName}
              </Link>{' '}
              package.
            </>
          ) : (
            <>These transactions were queued using multiple packages.</>
          )}
        </p>
      )}

      {/* Transactions */}
      <div className="max-w-full overflow-x-scroll">
        {hintData.txns.map((txn, i) => {
          const pkgUrl = hintData.cannonPackage.split(',')[i];

          return (
            <div key={`tx-${i}`} className="mb-4">
              <DisplayedTransaction
                txn={txn}
                chainId={props.safe.chainId}
                pkgUrl={
                  hintData.isSinglePackage ? hintData.cannonPackage : pkgUrl
                }
                cannonInfo={cannonInfo}
                isPreloaded={hintData.isSinglePackage}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
