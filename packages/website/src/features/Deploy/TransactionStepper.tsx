import * as viem from 'viem';
import {
  InfoCircledIcon,
  ExternalLinkIcon,
  CheckIcon,
} from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import { SafeTransaction } from '@/types/SafeTransaction';
import { formatDistanceToNow } from 'date-fns';
import React, { useMemo } from 'react';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { useSafeTransactionStatus, SafeTransactionStatus } from '@/hooks/safe';
import { useIsMobile } from '@/hooks/useMedia';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

type Orientation = 'horizontal' | 'vertical';

type StepProps = {
  title: string;
  description: string | React.ReactNode;
  isActive: boolean;
  isComplete: boolean;
  isError?: boolean;
  stepNumber: number;
  orientation?: Orientation;
  isLastStep?: boolean;
};

function Step({
  title,
  description,
  isActive,
  isComplete,
  isError,
  stepNumber,
  orientation = 'horizontal',
  isLastStep,
}: StepProps) {
  return (
    <div
      className={cn(
        'flex items-center',
        orientation === 'horizontal' ? 'flex-1' : 'w-full py-1'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs',
            isError
              ? 'border-destructive text-destructive'
              : isComplete
              ? 'border-teal-500 bg-teal-500 text-white'
              : isActive
              ? 'border-teal-500 text-teal-500'
              : 'border-muted-foreground/30 text-muted-foreground/30'
          )}
        >
          {isComplete ? <CheckIcon className="h-3.5 w-3.5" /> : stepNumber}
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-mono text-sm uppercase tracking-wider text-foreground block">
            {title}
          </span>
          <span className="text-xs text-muted-foreground block truncate">
            {description}
          </span>
        </div>
      </div>
      {!isLastStep && orientation === 'horizontal' && (
        <div
          className={cn(
            'flex-1 h-[1px] bg-border/30 mx-2',
            isComplete && 'bg-teal-500'
          )}
        />
      )}
    </div>
  );
}

export function TransactionStepper(props: {
  chainId: number;
  cannonPackage: any;
  safeTxn: SafeTransaction | null;
  published: boolean;
  publishable: boolean;
  signers: string[];
  threshold: number;
}) {
  const { getExplorerUrl } = useCannonChains();
  const isMobile = useIsMobile();
  const orientation = isMobile ? 'vertical' : 'horizontal';

  const packagePublished = props.published;
  const transactionHash = props.safeTxn?.transactionHash;
  const packageRef = props.cannonPackage?.resolvedName?.length
    ? `${props.cannonPackage.resolvedName}:${
        props.cannonPackage.resolvedVersion
      }${
        props.cannonPackage.resolvedPreset
          ? '@' + props.cannonPackage.resolvedPreset
          : ''
      }`
    : undefined;

  let activeStep = 1;
  if (packagePublished) {
    activeStep = 5;
  } else if (transactionHash) {
    activeStep = 3;
  } else if (props.signers.length >= props.threshold) {
    activeStep = 2;
  }

  const safeTransactionStatus = useSafeTransactionStatus(
    props.chainId,
    transactionHash as viem.Hash
  );

  const isExecutionFailure = useMemo(
    () => safeTransactionStatus === SafeTransactionStatus.EXECUTION_FAILURE,
    [safeTransactionStatus]
  );

  const queuedTimeAgo = useMemo(
    () =>
      props.safeTxn?.submissionDate
        ? formatDistanceToNow(
            new Date(Date.parse(props.safeTxn.submissionDate)),
            {
              addSuffix: true,
            }
          )
        : 'successfully',
    [props.safeTxn]
  );

  const packageName = props.cannonPackage.resolvedName;
  const version = props.cannonPackage.resolvedVersion || 'latest';
  const preset = props.cannonPackage.resolvedPreset || 'main';

  const steps = [
    {
      title: 'Queue',
      description: `added ${queuedTimeAgo}`,
    },
    {
      title: 'Sign',
      description: (
        <div className="flex items-center">
          {props.signers?.length || 0} of {props.threshold || 0} signed
          {props.signers?.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="hover:opacity-100">
                    <InfoCircledIcon className="ml-1 h-3 w-3 -translate-y-[0.5px] opacity-70" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  className="max-h-[200px] w-auto overflow-y-auto overflow-x-hidden"
                >
                  {props.signers.map((s) => (
                    <div key={s} className="mb-1">
                      {s}
                    </div>
                  ))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ),
    },
    {
      title: 'Execute',
      description: transactionHash ? (
        <div className="flex items-center">
          {`${transactionHash.substring(0, 6)}...${transactionHash.slice(-4)}`}
          <a
            href={getExplorerUrl(props.chainId, transactionHash as viem.Hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 opacity-70 hover:opacity-100"
          >
            <ExternalLinkIcon className="h-3 w-3 -translate-y-[0.5px]" />
          </a>
          {isExecutionFailure && (
            <span className="text-destructive">The execution has failed</span>
          )}
        </div>
      ) : (
        'Pending'
      ),
    },
    ...(props.publishable
      ? [
          {
            title: 'Publish',
            description: packageRef ? (
              <div className="flex items-center">
                {packageRef}
                {packagePublished && (
                  <a
                    href={`/packages/${packageName}/${version}/${props.chainId}-${preset}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 opacity-70 hover:opacity-100"
                  >
                    <ExternalLinkIcon className="h-3 w-3 -translate-y-[0.5px]" />
                  </a>
                )}
              </div>
            ) : (
              <>Loading...</>
            ),
          },
        ]
      : []),
  ];

  return (
    <div
      className={cn(
        'flex w-full',
        orientation === 'vertical' ? 'flex-col' : 'flex-row items-center'
      )}
    >
      {steps.map((step, index) => (
        <Step
          key={index}
          title={step.title}
          description={step.description}
          isActive={activeStep === index + 1}
          isComplete={activeStep > index + 1}
          isError={isExecutionFailure && index === 2}
          stepNumber={index + 1}
          orientation={orientation}
          isLastStep={index === steps.length - 1}
        />
      ))}
    </div>
  );
}
