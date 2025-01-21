import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import * as onchainStore from '@/helpers/onchain-store';
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
import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  stringToHex,
  toBytes,
  TransactionRequestBase,
  zeroAddress,
} from 'viem';
import { useMemo, useState } from 'react';
import {
  LocalBuildState,
  useCannonWriteDeployToIpfs,
  useMergedCannonDefInfo,
} from '@/hooks/cannon';
import { useMultisendQuery } from '@/helpers/multisend';
import { SafeDefinition } from '@/helpers/store';
import { useTxnStager } from '@/hooks/backend';

interface TransactionPreviewAndExecutionProps {
  buildState: LocalBuildState;
  writeToIpfsMutation: ReturnType<typeof useCannonWriteDeployToIpfs>;
  prevDeployLocation: string;
  cannonDefInfo: ReturnType<typeof useMergedCannonDefInfo>;
  currentSafe: SafeDefinition;
  ctx: ChainBuilderContext;
  gitInfo: CannonfileGitInfo;
}

export function TransactionPreviewAndExecution({
  buildState,
  writeToIpfsMutation,
  prevDeployLocation,
  cannonDefInfo,
  gitInfo,
  currentSafe,
  ctx,
}: TransactionPreviewAndExecutionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const execTxn = useWriteContract();
  const deployer = useDeployerWallet(currentSafe?.chainId);

  const isOutsideSafeTxnsRequired =
    (buildState.result?.deployerSteps.length || 0) > 0 && !deployer.isComplete;

  const refsInfo = useGitRefsList(gitInfo.gitUrl);
  const gitHash = getGitHash(refsInfo.refs, gitInfo.gitRef);

  const prevInfoQuery = useGetPreviousGitInfoQuery(
    currentSafe as any,
    gitInfo.gitUrl + ':' + gitInfo.gitFile
  );

  const [pickedNonce, setPickedNonce] = useState<number | null>(null);

  const multiSendTxsParam: Partial<TransactionRequestBase>[] = useMemo(() => {
    return [
      // supply the hint data
      {
        to: zeroAddress,
        data: encodeAbiParameters(
          [{ type: 'string[]' }],
          [
            [
              'deploy',
              writeToIpfsMutation.data?.mainUrl,
              prevDeployLocation || '',
              gitInfo.gitUrl && gitInfo.gitFile
                ? `${gitInfo.gitUrl}:${gitInfo.gitFile}`
                : '',
              gitHash || '',
              prevInfoQuery.data &&
              typeof prevInfoQuery.data?.[0].result == 'string' &&
              (prevInfoQuery.data[0].result as any).length > 2
                ? ((prevInfoQuery.data[0].result as any).slice(2) as any)
                : '',
            ],
          ]
        ),
      },
      // write data needed for the subsequent deployment to chain
      gitInfo.gitUrl && gitInfo.gitFile
        ? ({
            to: onchainStore.deployAddress,
            data: encodeFunctionData({
              abi: onchainStore.ABI,
              functionName: 'set',
              args: [
                keccak256(
                  toBytes(`${gitInfo.gitUrl}:${gitInfo.gitFile}gitHash`)
                ),
                '0x' + gitHash,
              ],
            }),
          } as Partial<TransactionRequestBase>)
        : {},
      gitInfo.gitUrl && gitInfo.gitFile
        ? ({
            to: onchainStore.deployAddress,
            data: encodeFunctionData({
              abi: onchainStore.ABI,
              functionName: 'set',
              args: [
                keccak256(
                  toBytes(`${gitInfo.gitUrl}:${gitInfo.gitFile}cannonPackage`)
                ),
                stringToHex(writeToIpfsMutation.data?.mainUrl ?? ''),
              ],
            }),
          } as Partial<TransactionRequestBase>)
        : {},
      {
        to: onchainStore.deployAddress,
        data: encodeFunctionData({
          abi: onchainStore.ABI,
          functionName: 'set',
          args: [
            keccak256(
              toBytes(
                cannonDefInfo?.def
                  ? `${cannonDefInfo.def.getName(
                      ctx
                    )}@${cannonDefInfo.def.getPreset(ctx)}`
                  : ''
              )
            ),
            // TODO: we would really rather have the timestamp be when the txn was executed. something to fix when we have a new state contract
            stringToHex(
              `${Math.floor(Date.now() / 1000)}_${
                writeToIpfsMutation.data?.mainUrl ?? ''
              }`
            ),
          ],
        }),
      } as Partial<TransactionRequestBase>,
    ].concat(
      buildState.result?.safeSteps.map(
        (s) => s.tx as unknown as Partial<TransactionRequestBase>
      ) || []
    );
  }, [
    cannonDefInfo.def,
    gitInfo.gitFile,
    gitHash,
    gitInfo.gitUrl,
    prevDeployLocation,
    prevInfoQuery.data,
    ctx,
    writeToIpfsMutation.data?.mainUrl,
    buildState.result?.safeSteps,
  ]);

  const { data: multicallTxn } = useMultisendQuery(
    Boolean(
      !prevInfoQuery.isLoading &&
        buildState.result &&
        buildState.status == 'success'
    ),
    multiSendTxsParam
  );

  let totalGas = BigInt(0);

  for (const step of buildState.result?.safeSteps || []) {
    totalGas += BigInt(step.gas.toString());
  }

  const stager = useTxnStager(
    multicallTxn?.data
      ? ({
          to: multicallTxn.to,
          value: multicallTxn.value.toString(),
          data: multicallTxn.data,
          safeTxGas: totalGas.toString(),
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
        writeToIpfsMutation?.data?.mainUrl &&
        !multicallTxn?.data && (
          <Alert className="mt-6" variant="info">
            <AlertDescription>
              No simulated transactions have succeeded. Please ensure you have
              selected the correct Safe wallet and that you have sufficient
              permissions to execute transactions.
            </AlertDescription>
          </Alert>
        )}
      {writeToIpfsMutation?.data?.mainUrl &&
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
      {writeToIpfsMutation?.data?.mainUrl &&
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
      {writeToIpfsMutation?.isPending && (
        <Alert className="mt-6" variant="info">
          <strong>Uploading build result to IPFS...</strong>
        </Alert>
      )}
      {writeToIpfsMutation?.error && (
        <p className="text-red-500">
          Failed to upload staged transaction to IPFS:{' '}
          {writeToIpfsMutation.error.toString()}
        </p>
      )}
      {writeToIpfsMutation?.data?.mainUrl && multicallTxn?.data && (
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
