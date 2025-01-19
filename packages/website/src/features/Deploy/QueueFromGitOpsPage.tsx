'use client';

import { links } from '@/constants/links';
import { useMultisendQuery } from '@/helpers/multisend';
import * as onchainStore from '@/helpers/onchain-store';
import { useStore } from '@/helpers/store';
import { useTxnStager } from '@/hooks/backend';
import { useDeployerWallet } from '@/hooks/deployer';
import {
  useCannonWriteDeployToIpfs,
  CannonWriteDeployToIpfsMutationResult,
  useCannonBuild,
} from '@/hooks/cannon';
import { useGitRefsList } from '@/hooks/git';
import { useGetPreviousGitInfoQuery } from '@/hooks/safe';
import { SafeTransaction } from '@/types/SafeTransaction';
import { Card, CardContent } from '@/components/ui/card';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import {
  ChainBuilderContext,
  DeploymentInfo,
  getIpfsUrl,
  PackageReference,
} from '@usecannon/builder';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  stringToHex,
  toBytes,
  TransactionRequestBase,
  zeroAddress,
} from 'viem';
import { useAccount } from 'wagmi';
import pkg from '../../../package.json';
import 'react-diff-view/style/index.css';
import { extractIpfsHash } from '@/helpers/ipfs';
import { isCannonFileURL } from '@/helpers/isCannonFileURL';
import { CannonFileInput } from '@/features/Deploy/CannonFileInput';
import {
  DeploymentSourceInput,
  DeployType,
} from '@/features/Deploy/DeploymentSourceInput';
import { PreviousPackageInput } from '@/features/Deploy/PreviousPackageInput';
import { TransactionPreviewAndExecution } from '@/features/Deploy/TransactionPreviewAndExecution';
import { BuildStateAlerts } from '@/features/Deploy/BuildStateAlerts';
import { PreviewTransactionsButton } from '@/features/Deploy/PreviewTransactionsButton';
import { useToast } from '@/hooks/use-toast';
import { useForm, FormProvider } from 'react-hook-form';
import { PrevDeploymentStatus } from '@/features/Deploy/PrevDeploymentStatus';
import { useCannonDefinitions } from '@/features/Deploy/hooks/useCannonDefinitions';
import { IpfsGatewayAlert } from '@/features/Deploy/IpfsGatewayAlert';
import { useCannonDefinitionDerivedState } from './hooks/useCannonDefinitionDerivedState';

const EMPTY_IPFS_MISC_URL =
  'ipfs://QmeSt2mnJKE8qmRhLyYbHQQxDKpsFbcWnw5e7JF4xVbN6k';

// TODO: is there any way to make a better context? maybe this means we should get rid of name using context?
const ctx: ChainBuilderContext = {
  chainId: 0,
  package: {},
  timestamp: 0 as any, // TODO: fix this
  settings: {},
  contracts: {},
  txns: {},
  imports: {},
  overrideSettings: {},
};

export default function QueueFromGitOps() {
  const form = useForm();
  const router = useRouter();
  const currentSafe = useStore((s) => s.currentSafe)!;
  const settings = useStore((s) => s.settings);
  const { toast } = useToast();
  const { chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const deployer = useDeployerWallet(currentSafe?.chainId);
  const writeToIpfsMutation = useCannonWriteDeployToIpfs();

  const [selectedDeployType, setSelectedDeployType] =
    useState<DeployType>('git');
  const [deploymentSourceInput, setDeploymentSourceInput] = useState('');
  const [cannonfileUrlInput, setCannonfileUrlInput] = useState('');
  const [partialDeployIpfs, setPartialDeployIpfs] = useState('');
  const [prevPackageInputRef, setPrevPackageInputRef] = useState<string | null>(
    null
  );

  const [previousPackageInput, setPreviousPackageInput] = useState('');
  const [pickedNonce, setPickedNonce] = useState<number | null>(null);
  const [writeToIpfsMutationRes, setWriteToIpfsMutationRes] = useState<{
    isLoading: boolean;
    error: Error | null;
    data: CannonWriteDeployToIpfsMutationResult | null;
  } | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const {
    gitInfo,
    partialDeployInfo,
    cannonDefInfo,
    cannonDefInfoError,
    onChainPrevPkgQuery,
    prevDeployLocation,
    prevCannonDeployInfo,
    isLoading: isCannonDefinitionLoading,
    isLoaded: isCannonDefinitionLoaded,
  } = useCannonDefinitions({
    cannonfileUrlInput,
    partialDeployIpfs,
    chainId,
    prevPackageReference: prevPackageInputRef,
    ctx,
  });

  // TODO: useCannonDefinitionDerivedState should be a hook that takes in the result of useCannonDefinitions
  // and forwards the result to the component.
  const {
    requiresPrevPackage,
    cannonInfoDefinitionLoaded,
    hasDeployers,
    error: cannonDefinitionError,
  } = useCannonDefinitionDerivedState({
    cannonDefInfo,
    cannonfileUrlInput,
    partialDeployInfo,
    isLoading: isCannonDefinitionLoading,
  });

  const {
    buildState,
    doBuild, // run the build and get the list of transactions we need to run
    resetState: buildResetState,
  } = useCannonBuild(currentSafe);

  const refsInfo = useGitRefsList(gitInfo.gitUrl);

  const prevInfoQuery = useGetPreviousGitInfoQuery(
    currentSafe as any,
    gitInfo.gitUrl + ':' + gitInfo.gitFile
  );

  // ---------------------------
  // Effects and Memos
  // ---------------------------
  useEffect(() => {
    if (PackageReference.isValid(previousPackageInput)) {
      setPrevPackageInputRef(
        new PackageReference(previousPackageInput).fullPackageRef
      );
    } else if (getIpfsUrl(previousPackageInput)) {
      setPrevPackageInputRef(getIpfsUrl(previousPackageInput));
    } else {
      setPrevPackageInputRef(null); // TODO: SHOW an error???
    }
  }, [previousPackageInput]);

  const nextCannonDeployInfo = useMemo(() => {
    return cannonDefInfo?.def
      ? ({
          generator: `cannon website ${pkg.version}`,
          timestamp: Math.floor(Date.now() / 1000),
          def: cannonDefInfo.def.toJson(),
          state: buildState.result?.state || {},
          options: partialDeployInfo?.ipfsQuery.data?.deployInfo?.options || {},
          meta: partialDeployInfo?.ipfsQuery.data?.deployInfo?.meta,
          miscUrl:
            partialDeployInfo?.ipfsQuery.data?.deployInfo?.miscUrl ||
            EMPTY_IPFS_MISC_URL,
          chainId: currentSafe.chainId,
        } satisfies DeploymentInfo)
      : undefined;
  }, [
    buildState.result?.state,
    cannonDefInfo?.def,
    currentSafe.chainId,
    partialDeployInfo?.ipfsQuery.data?.deployInfo?.meta,
    partialDeployInfo?.ipfsQuery.data?.deployInfo?.miscUrl,
    partialDeployInfo?.ipfsQuery.data?.deployInfo?.options,
  ]);

  useEffect(() => {
    // After loading the deployment info, set a default value for the upgradeFrom field
    if (hasDeployers || !nextCannonDeployInfo?.def) {
      return setPreviousPackageInput('');
    }

    const { name, preset } = nextCannonDeployInfo.def;
    const { fullPackageRef } = PackageReference.from(name, 'latest', preset);
    setPreviousPackageInput(fullPackageRef);
  }, [nextCannonDeployInfo, hasDeployers]);

  const foundRef = refsInfo.refs?.find(
    (r) =>
      (r.ref.startsWith('refs/heads/') || r.ref.startsWith('refs/tags/')) &&
      r.ref.endsWith(gitInfo.gitRef)
  )?.oid;
  const gitHash = gitInfo.gitRef.match(/^[0-9a-f]+$/)
    ? foundRef || gitInfo.gitRef
    : foundRef;

  // ---------------------------
  // Build stuff
  // ---------------------------

  useEffect(() => {
    const callMutation = async () => {
      if (['success'].includes(buildState.status)) {
        try {
          setWriteToIpfsMutationRes({
            isLoading: true,
            error: null,
            data: null,
          });

          const res = await writeToIpfsMutation.mutateAsync({
            runtime: buildState.result?.runtime,
            deployInfo: nextCannonDeployInfo,
            metaUrl: prevCannonDeployInfo.metaUrl,
          });

          setWriteToIpfsMutationRes({
            isLoading: false,
            error: null,
            data: res,
          });
        } catch (error) {
          setWriteToIpfsMutationRes({
            isLoading: false,
            error: error as Error,
            data: null,
          });
        }
      }
    };

    void callMutation();
  }, [buildState.status]);

  const multisendTxsParam = useMemo(() => {
    return [
      // supply the hint data
      {
        to: zeroAddress,
        data: encodeAbiParameters(
          [{ type: 'string[]' }],
          [
            [
              'deploy',
              writeToIpfsMutationRes?.data?.mainUrl,
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
      } as Partial<TransactionRequestBase>,
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
                stringToHex(writeToIpfsMutationRes?.data?.mainUrl ?? ''),
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
                writeToIpfsMutationRes?.data?.mainUrl ?? ''
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
    buildState.result?.safeSteps,
    cannonDefInfo?.def,
    gitInfo.gitFile,
    gitHash,
    gitInfo.gitUrl,
    prevDeployLocation,
    prevInfoQuery.data,
    writeToIpfsMutationRes?.data?.mainUrl,
  ]);

  const { data: multicallTxn } = useMultisendQuery(
    Boolean(
      !prevInfoQuery.isLoading &&
        buildState.result &&
        buildState.status == 'success'
    ),
    multisendTxsParam
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
          operation: '1', // delegate call multicall
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

  const isOutsideSafeTxnsRequired =
    (buildState.result?.deployerSteps.length || 0) > 0 && !deployer.isComplete;

  const buildStateMessage = buildState.message || null;
  const buildStateError = buildState.error || null;

  // ---------------------------
  // Build stuff end
  // ---------------------------

  const handleDeploymentSourceInputChange = useCallback(
    (input: string) => {
      buildResetState();
      setCannonfileUrlInput('');
      setPartialDeployIpfs('');
      setInputError(null);

      const isIpfsHash = extractIpfsHash(input);

      if (isCannonFileURL(input)) {
        setSelectedDeployType('git');
        setCannonfileUrlInput(input);
      } else if (isIpfsHash) {
        setSelectedDeployType('partial');
        setPartialDeployIpfs(isIpfsHash);
      } else if (input.trim() !== '') {
        setInputError(
          'Invalid input. Please enter a valid Cannonfile URL or IPFS hash.'
        );
      }
    },
    [buildResetState]
  );

  return (
    <FormProvider {...form}>
      <div className="container py-8 max-w-3xl">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Queue Deployment</h2>
            {/* Git or Hash Input */}
            <div className="mb-4">
              <DeploymentSourceInput
                deploymentSourceInput={deploymentSourceInput}
                setDeploymentSourceInput={setDeploymentSourceInput}
                selectedDeployType={selectedDeployType}
                cannonfileUrlInput={cannonfileUrlInput}
                cannonDefInfo={cannonDefInfo}
                cannonInfoDefinitionLoaded={cannonInfoDefinitionLoaded}
                partialDeployInfo={partialDeployInfo}
                partialDeployInfoLoaded={isCannonDefinitionLoaded}
                chainId={chainId}
                currentSafe={currentSafe}
                cannonDefInfoError={cannonDefInfoError}
                inputError={inputError}
                handleDeploymentSourceInputChange={
                  handleDeploymentSourceInputChange
                }
              />
            </div>
            {/* Deployment alert status  */}
            {selectedDeployType == 'git' && onChainPrevPkgQuery.isFetched && (
              <PrevDeploymentStatus
                prevDeployLocation={prevDeployLocation}
                tomlRequiresPrevPackage={requiresPrevPackage}
              />
            )}
            {/* Hash: Prev deployment Input */}
            {(isCannonDefinitionLoaded || requiresPrevPackage) && (
              <div className="mb-4">
                <PreviousPackageInput
                  previousPackageInput={previousPackageInput}
                  setPreviousPackageInput={setPreviousPackageInput}
                  prevCannonDeployInfo={prevCannonDeployInfo}
                  onChainPrevPkgQuery={onChainPrevPkgQuery}
                />
              </div>
            )}
            {/* Hash: CannonFile to compare with prev deployment */}
            {selectedDeployType == 'partial' &&
              partialDeployIpfs.length > 0 &&
              isCannonDefinitionLoaded && (
                <div className="mb-4">
                  <CannonFileInput
                    cannonfileUrlInput={cannonfileUrlInput}
                    setCannonfileUrlInput={setCannonfileUrlInput}
                    cannonDefInfo={cannonDefInfo}
                    cannonDefInfoError={cannonDefInfoError}
                    isDisabled={!partialDeployIpfs}
                  />
                </div>
              )}
            {/* IPFS Gateway alert */}
            <IpfsGatewayAlert
              isIpfsGateway={settings.isIpfsGateway}
              cannonDef={cannonDefInfo?.def}
            />
            {/* PreviewTransactionsButton */}
            {onChainPrevPkgQuery.isFetched && (
              <PreviewTransactionsButton
                isConnected={isConnected}
                chainId={chainId}
                currentSafe={currentSafe}
                openConnectModal={openConnectModal}
                deploymentSourceInput={deploymentSourceInput}
                partialDeployInfo={partialDeployInfo}
                cannonDefInfo={cannonDefInfo}
                error={cannonDefinitionError}
                isDeploying={Boolean(
                  buildState.status === 'building' ||
                    writeToIpfsMutationRes?.isLoading
                )}
                handlePreviewTxnsClick={async () => {
                  doBuild(
                    cannonDefInfo?.def,
                    partialDeployInfo?.ipfsQuery.data?.deployInfo ??
                      prevCannonDeployInfo.ipfsQuery.data?.deployInfo
                  );
                }}
                isLoading={isCannonDefinitionLoading}
                buildStatus={buildState.status}
              />
            )}

            {/* Build status */}
            <BuildStateAlerts
              buildState={buildState}
              buildStateMessage={buildStateMessage}
              buildStateError={buildStateError}
              deployer={deployer}
            />

            {/* Build result */}
            <TransactionPreviewAndExecution
              buildState={buildState}
              writeToIpfsMutationRes={writeToIpfsMutationRes}
              multicallTxn={multicallTxn}
              cannonDefInfo={cannonDefInfo}
              stager={stager}
              currentSafe={currentSafe}
              isOutsideSafeTxnsRequired={isOutsideSafeTxnsRequired}
              ctx={ctx}
              pickedNonce={pickedNonce}
              setPickedNonce={setPickedNonce}
            />
          </CardContent>
        </Card>
      </div>
    </FormProvider>
  );
}
