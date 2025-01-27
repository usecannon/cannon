import { useQuery } from '@tanstack/react-query';
import {
  TransactionRequestBase,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  stringToHex,
  toBytes,
  zeroAddress,
} from 'viem';
import * as onchainStore from '@/helpers/onchain-store';
import { ChainBuilderContext } from '@usecannon/builder';
import { CannonfileGitInfo } from '@/features/Deploy/hooks/useGitDetailsFromCannonfile';
import { LocalBuildState, useCannonWriteDeployToIpfs, useMergedCannonDefInfo } from '@/hooks/cannon';
import { useMultisendQuery } from '@/helpers/multisend';

interface UseMultisendTxsParamsProps {
  buildState: LocalBuildState;
  writeToIpfsMutation: ReturnType<typeof useCannonWriteDeployToIpfs>;
  prevDeployLocation: string;
  cannonDefInfo: ReturnType<typeof useMergedCannonDefInfo>;
  gitInfo: CannonfileGitInfo;
  ctx: ChainBuilderContext;
  prevInfoQuery: any; // Replace with proper type
  gitHash: string | undefined;
}

export function useMultisendTxsParams({
  buildState,
  writeToIpfsMutation,
  prevDeployLocation,
  cannonDefInfo,
  gitInfo,
  ctx,
  prevInfoQuery,
  gitHash,
}: UseMultisendTxsParamsProps) {
  // Calculate multiSendTxsParam
  const { data: multiSendTxsParam = [] } = useQuery({
    queryKey: [
      'multiSendTxsParam',
      {
        cannonDefInfo,
        gitHash,
        gitInfo,
        prevDeployLocation,
        prevInfoQuery: prevInfoQuery.data,
        writeToIpfsMutation: writeToIpfsMutation.data,
        buildState: buildState.result,
      },
    ],
    queryFn: () => {
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
                gitInfo.gitUrl && gitInfo.gitFile ? `${gitInfo.gitUrl}:${gitInfo.gitFile}` : '',
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
                args: [keccak256(toBytes(`${gitInfo.gitUrl}:${gitInfo.gitFile}gitHash`)), '0x' + gitHash],
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
                  keccak256(toBytes(`${gitInfo.gitUrl}:${gitInfo.gitFile}cannonPackage`)),
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
                toBytes(cannonDefInfo?.def ? `${cannonDefInfo.def.getName(ctx)}@${cannonDefInfo.def.getPreset(ctx)}` : '')
              ),
              stringToHex(`${Math.floor(Date.now() / 1000)}_${writeToIpfsMutation.data?.mainUrl ?? ''}`),
            ],
          }),
        } as Partial<TransactionRequestBase>,
      ].concat(buildState.result?.safeSteps.map((s) => s.tx as unknown as Partial<TransactionRequestBase>) || []);
    },
    enabled: !prevInfoQuery.isLoading && Boolean(buildState.result) && buildState.status === 'success',
  });

  // Use the multicall query with the calculated params
  const { data: multicallTxn } = useMultisendQuery(Boolean(multiSendTxsParam.length), multiSendTxsParam);

  return multicallTxn;
}
