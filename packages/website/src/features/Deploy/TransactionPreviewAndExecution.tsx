import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CustomSpinner } from '@/components/CustomSpinner';
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

interface TransactionPreviewAndExecutionProps {
  buildState: any;
  writeToIpfsMutationRes: any;
  multicallTxn: any;
  cannonDefInfo: any;
  stager: any;
  currentSafe: any;
  isOutsideSafeTxnsRequired: boolean;
  ctx: ChainBuilderContext;
  pickedNonce: number | null;
  setPickedNonce: (nonce: number | null) => void;
}

export function TransactionPreviewAndExecution({
  buildState,
  writeToIpfsMutationRes,
  multicallTxn,
  cannonDefInfo,
  stager,
  currentSafe,
  isOutsideSafeTxnsRequired,
  ctx,
  setPickedNonce,
}: TransactionPreviewAndExecutionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const execTxn = useWriteContract();

  return (
    <>
      {cannonDefInfo?.def && multicallTxn?.data && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mt-5">
            Package: {cannonDefInfo.def.getName(ctx)}:
            {cannonDefInfo.def.getVersion(ctx) || 'latest'}@
            {cannonDefInfo.def.getPreset(ctx)}
          </h2>
        </div>
      )}
      {buildState.status == 'success' &&
        writeToIpfsMutationRes?.data?.mainUrl &&
        !multicallTxn?.data && (
          <Alert className="mt-6" variant="info">
            <AlertDescription>
              No simulated transactions have succeeded. Please ensure you have
              selected the correct Safe wallet and that you have sufficient
              permissions to execute transactions.
            </AlertDescription>
          </Alert>
        )}
      {writeToIpfsMutationRes?.data?.mainUrl &&
        multicallTxn?.data &&
        stager.safeTxn && (
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
                safe={currentSafe as any}
                safeTxn={stager.safeTxn}
              />
            )}
          </div>
        )}
      {writeToIpfsMutationRes?.data?.mainUrl &&
        multicallTxn?.data &&
        stager.safeTxn &&
        (buildState.result?.safeSteps.length || 0) > 0 &&
        buildState.skippedSteps.length > 0 && (
          <Alert variant="warning" className="mt-0 border-none">
            <AlertDescription>
              We have detected transactions in your Cannonfile that cannot be
              executed, which may lead to undesired effects on your deployment.
              We advise you not to proceed unless you are absolutely certain of
              what you are doing, as this will result in a partial deployment
              package.
            </AlertDescription>
          </Alert>
        )}
      {writeToIpfsMutationRes?.isLoading && (
        <Alert className="mt-6" variant="info">
          <CustomSpinner className="mr-3 h-4 w-4" />
          <strong>Uploading build result to IPFS...</strong>
        </Alert>
      )}
      {writeToIpfsMutationRes?.error && (
        <p className="text-red-500">
          Failed to upload staged transaction to IPFS:{' '}
          {writeToIpfsMutationRes.error.toString()}
        </p>
      )}
      {writeToIpfsMutationRes?.data?.mainUrl && multicallTxn?.data && (
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
                    {stager.signing ? (
                      <>
                        Currently Signing
                        <CustomSpinner className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      'Queue & Sign'
                    )}
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
