import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SafeTransaction } from '@/types/SafeTransaction';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { links } from '@/constants/links';
import { TransactionDisplay } from './TransactionDisplay';
import NoncePicker from './NoncePicker';
import { useWriteContract } from 'wagmi';
import { ChainBuilderContext } from '@usecannon/builder';
import { useToast } from '@/hooks/use-toast';
import { useDeployerWallet } from '@/hooks/deployer';
import { CannonfileGitInfo } from '@/features/Deploy/hooks/useGitDetailsFromCannonfile';
import { getGitHash, useGitRefsList } from '@/hooks/git';
import { useGetPreviousGitInfoQuery } from '@/hooks/safe';
import { useState } from 'react';
import {
  CannonTxRecord,
  LocalBuildState,
  useCannonWriteDeployToIpfs,
  useMergedCannonDefInfo,
} from '@/hooks/cannon';
import { SafeDefinition } from '@/helpers/store';
import { useTxnStager } from '@/hooks/backend';
import { useMultisendTxsParams } from '@/features/Deploy/hooks/useMultisendTxsParams';

interface Props {
  buildState: LocalBuildState;
  writeToIpfsMutation: ReturnType<typeof useCannonWriteDeployToIpfs>;
  prevDeployLocation: string;
  cannonDefInfo: ReturnType<typeof useMergedCannonDefInfo>;
  currentSafe: SafeDefinition;
  ctx: ChainBuilderContext;
  gitInfo: CannonfileGitInfo;
}

// Helper function to calculate total gas from safe steps
function calculateTotalGas(safeSteps: CannonTxRecord[] | undefined): bigint {
  return (safeSteps || []).reduce(
    (total, step) => total + BigInt(step.gas.toString()),
    BigInt(0)
  );
}

export function SafeTransactionsAndExecution({
  buildState,
  writeToIpfsMutation,
  prevDeployLocation,
  cannonDefInfo,
  gitInfo,
  currentSafe,
  ctx,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const execTxn = useWriteContract();
  const deployer = useDeployerWallet(currentSafe?.chainId);
  const refsInfo = useGitRefsList(gitInfo.gitUrl);
  const gitHash = getGitHash(refsInfo.refs, gitInfo.gitRef);
  const prevInfoQuery = useGetPreviousGitInfoQuery(
    currentSafe,
    gitInfo.gitUrl + ':' + gitInfo.gitFile
  );
  const [pickedNonce, setPickedNonce] = useState<number | null>(null);
  const multicallTxn = useMultisendTxsParams({
    buildState,
    writeToIpfsMutation,
    prevDeployLocation,
    cannonDefInfo,
    gitInfo,
    ctx,
    prevInfoQuery,
    gitHash,
  });

  const isOutsideSafeTxnsRequired =
    (buildState.result?.deployerSteps.length || 0) > 0 && !deployer.isComplete;

  const stager = useTxnStager(
    multicallTxn?.data
      ? ({
          to: multicallTxn.to,
          value: multicallTxn.value.toString(),
          data: multicallTxn.data,
          safeTxGas: calculateTotalGas(buildState.result?.safeSteps).toString(),
          operation: '1', // delegate call multiCall
          _nonce: pickedNonce,
        } as SafeTransaction)
      : {},
    {
      safe: currentSafe,
      async onSignComplete() {
        router.push(links.DEPLOY);
        toast({
          title: 'You successfully signed the transaction.',
          variant: 'default',
          duration: 5000,
        });
      },
    }
  );

  const showPackage = cannonDefInfo && cannonDefInfo.def && multicallTxn?.data;
  const simulationFailed =
    buildState.status == 'success' &&
    writeToIpfsMutation?.data?.mainUrl &&
    !multicallTxn?.data;
  const safeTxns =
    writeToIpfsMutation?.data?.mainUrl && multicallTxn?.data && stager.safeTxn;
  const skippedSteps =
    writeToIpfsMutation?.data?.mainUrl &&
    multicallTxn?.data &&
    stager.safeTxn &&
    (buildState.result?.safeSteps.length || 0) > 0 &&
    buildState.skippedSteps.length > 0;
  const canExecute = writeToIpfsMutation?.data?.mainUrl && multicallTxn?.data;

  return (
    <>
      {showPackage && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mt-5">
            Package: {cannonDefInfo?.def?.getName(ctx)}:
            {cannonDefInfo?.def?.getVersion(ctx) || 'latest'}@
            {cannonDefInfo?.def?.getPreset(ctx)}
          </h2>
        </div>
      )}
      {simulationFailed && (
        <Alert className="mt-6" variant="info">
          <AlertDescription>
            No simulated transactions have succeeded. Please ensure you have
            selected the correct Safe wallet and that you have sufficient
            permissions to execute transactions.
          </AlertDescription>
        </Alert>
      )}
      {safeTxns && (
        <div className="mt-4 mb-4">
          <h3 className="text-sm font-semibold mb-2">Safe Transactions:</h3>
          {buildState.result?.safeSteps.length === 0 ? (
            <Alert variant="info" className="border-none">
              <AlertDescription>
                There are no transactions that would be executed by the Safe.
              </AlertDescription>
            </Alert>
          ) : (
            <TransactionDisplay
              safeSteps={buildState.result?.safeSteps}
              safe={currentSafe as any}
              safeTxn={stager.safeTxn}
            />
          )}
        </div>
      )}
      {skippedSteps && (
        <Alert variant="warning" className="mt-0 border-none">
          <AlertDescription>
            We have detected transactions in your Cannonfile that cannot be
            executed, which may lead to undesired effects on your deployment. We
            advise you not to proceed unless you are absolutely certain of what
            you are doing, as this will result in a partial deployment package.
          </AlertDescription>
        </Alert>
      )}
      {canExecute && (
        <div>
          <NoncePicker safe={currentSafe} handleChange={setPickedNonce} />
          <div className="flex gap-6">
            {stager.execConditionFailed &&
            (buildState.result?.safeSteps.length || 0) > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={!!stager.signConditionFailed || stager.signing}
                    variant="default"
                    size="lg"
                    className="w-full"
                    onClick={async () => {
                      await stager.sign();
                    }}
                  >
                    {stager.signing ? <>Currently Signing</> : 'Queue & Sign'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{stager.signConditionFailed}</TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled={
                    !!stager.execConditionFailed || isOutsideSafeTxnsRequired
                  }
                  size="lg"
                  variant="default"
                  className="w-full"
                  onClick={() => {
                    execTxn.writeContract(stager.executeTxnConfig!, {
                      onSuccess: () => {
                        router.push(links.DEPLOY);

                        toast({
                          title: 'You successfully executed the transaction.',
                          variant: 'default',
                          duration: 5000,
                        });
                      },
                    });
                  }}
                >
                  Execute
                </Button>
              </TooltipTrigger>
              <TooltipContent>{stager.execConditionFailed}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </>
  );
}
