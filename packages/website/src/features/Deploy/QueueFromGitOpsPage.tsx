'use client';

import { useStore } from '@/helpers/store';
import { useDeployerWallet } from '@/hooks/deployer';
import {
  useCannonWriteDeployToIpfs,
  useCannonBuild,
  LocalBuildState,
} from '@/hooks/cannon';
import { Card, CardContent } from '@/components/ui/card';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { getIpfsUrl, PackageReference } from '@usecannon/builder';
import React, { useEffect, useState, useCallback } from 'react';
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
import { SafeTransactionsAndExecution } from '@/features/Deploy/SafeTransactionsAndExecution';
import { BuildStateAlerts } from '@/features/Deploy/BuildStateAlerts';
import { PreviewTransactionsButton } from '@/features/Deploy/PreviewTransactionsButton';
import { useForm, FormProvider } from 'react-hook-form';
import { PrevDeploymentStatus } from '@/features/Deploy/PrevDeploymentStatus';
import { useCannonPackage } from '@/features/Deploy/hooks/useCannonPackage';
import { IpfsGatewayAlert } from '@/features/Deploy/IpfsGatewayAlert';
import WriteToIpfsStatus from '@/features/Deploy/WriteToIpfsStatus';
import { PackageErrors } from '@/features/Deploy/PackageErrors';

const EMPTY_IPFS_MISC_URL =
  'ipfs://QmeSt2mnJKE8qmRhLyYbHQQxDKpsFbcWnw5e7JF4xVbN6k';

export default function QueueFromGitOps() {
  const form = useForm();
  const currentSafe = useStore((s) => s.currentSafe)!;
  const settings = useStore((s) => s.settings);
  const { chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const deployer = useDeployerWallet(currentSafe?.chainId);
  const writeToIpfsMutation = useCannonWriteDeployToIpfs();

  const [selectedDeployType, setSelectedDeployType] =
    useState<DeployType>('git');
  const [deploymentSourceInput, setDeploymentSourceInput] = useState('');
  const [cannonfileUrlInput, setCannonfileUrlInput] = useState('');
  const [partialDeployIpfs, setPartialDeployIpfs] = useState('');

  const [prevPackageReference, setPrevPackageReference] = useState<string>('');
  const [previousPackageInput, setPreviousPackageInput] = useState(''); // packageRef or ipfsUrl

  const [inputError, setInputError] = useState<string>('');

  const {
    isLoading: isCannonPackageLoading,
    loaded: isCannonPackageLoaded,
    error: cannonPackageError,

    gitInfo,
    partialDeployInfo,
    cannonDefInfo,
    onChainPrevPkgQuery,
    prevDeployLocation,
    prevCannonDeployInfo,
    ctx,
    hasDeployers,
    requiresPrevPackage,
  } = useCannonPackage({
    cannonfileUrlInput,
    partialDeployIpfs,
    chainId,
    prevPackageReference: prevPackageReference,
  });

  const {
    buildState,
    doBuild, // run the build and get the list of transactions we need to run
    resetState: buildResetState,
  } = useCannonBuild(currentSafe);

  // ---------------------------
  // Effects and Memos
  // ---------------------------

  // Set the previous package input if it is a valid package reference or ipfs url
  // TODO: SHOW an error is input is not valid?
  useEffect(() => {
    if (PackageReference.isValid(previousPackageInput)) {
      const fullPackageRef = new PackageReference(previousPackageInput)
        .fullPackageRef;
      setPrevPackageReference(fullPackageRef);
      return;
    }

    const ipfsUrl = getIpfsUrl(previousPackageInput);
    if (ipfsUrl) {
      setPrevPackageReference(ipfsUrl);
      return;
    }

    return setPrevPackageReference('');
  }, [previousPackageInput]);

  // Set the previous package input if cannonDefInfo.def.fullPackageRef is valid
  useEffect(() => {
    if (!cannonDefInfo.def) return;

    const def = cannonDefInfo.def.toJson();

    if (hasDeployers && !def) {
      const { name, preset } = def;
      const { fullPackageRef } = PackageReference.from(name, 'latest', preset);
      setPreviousPackageInput(fullPackageRef);
    } else {
      setPreviousPackageInput('');
    }
  }, [hasDeployers, cannonDefInfo.def]);

  // Upload artifacts to IPFS when the build is successful
  const onBuildSuccess = async (res: LocalBuildState['result']) => {
    if (!cannonDefInfo?.def) throw new Error('No cannonfile definition found');
    if (!res) throw new Error('No build result found');

    const nextCannonDeployInfo = {
      generator: `cannon website ${pkg.version}` as `cannon ${string}`,
      timestamp: Math.floor(Date.now() / 1000),
      def: cannonDefInfo.def.toJson(),
      state: res.state,
      options: partialDeployInfo?.ipfsQuery.data?.deployInfo?.options || {},
      meta: partialDeployInfo?.ipfsQuery.data?.deployInfo?.meta,
      miscUrl:
        partialDeployInfo?.ipfsQuery.data?.deployInfo?.miscUrl ||
        EMPTY_IPFS_MISC_URL,
      chainId: currentSafe.chainId,
    };

    return writeToIpfsMutation.mutateAsync({
      runtime: res.runtime,
      deployInfo: nextCannonDeployInfo,
      metaUrl: prevCannonDeployInfo.metaUrl,
    });
  };

  // handle deployment source input change (Git or Hash)
  const handleDeploymentSourceInputChange = useCallback(
    (input: string) => {
      buildResetState();
      setCannonfileUrlInput('');
      setPartialDeployIpfs('');
      setInputError('');

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
                isLoading={isCannonPackageLoading}
                error={cannonPackageError?.message}
                loaded={isCannonPackageLoaded}
                deploymentSourceInput={deploymentSourceInput}
                setDeploymentSourceInput={setDeploymentSourceInput}
                selectedDeployType={selectedDeployType}
                cannonfileUrlInput={cannonfileUrlInput}
                partialDeployInfo={partialDeployInfo}
                chainId={chainId}
                currentSafe={currentSafe}
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
            {cannonDefInfo?.def && requiresPrevPackage && (
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
              cannonDefInfo?.def && (
                <div className="mb-4">
                  <CannonFileInput
                    cannonfileUrlInput={cannonfileUrlInput}
                    setCannonfileUrlInput={setCannonfileUrlInput}
                    cannonDefInfo={cannonDefInfo}
                    isDisabled={!partialDeployIpfs}
                  />
                </div>
              )}
            {/* IPFS Gateway alert */}
            {cannonDefInfo?.def && (
              <IpfsGatewayAlert
                isIpfsGateway={settings.isIpfsGateway}
                cannonDef={cannonDefInfo.def}
              />
            )}
            {/* Package errors */}
            <PackageErrors error={cannonPackageError?.message} />

            {/* On Package Loaded */}
            {isCannonPackageLoaded && (
              <>
                <PreviewTransactionsButton
                  isConnected={isConnected}
                  chainId={chainId}
                  currentSafe={currentSafe}
                  openConnectModal={openConnectModal}
                  partialDeployInfo={partialDeployInfo}
                  cannonDefInfo={cannonDefInfo}
                  isDeploying={Boolean(
                    buildState.status === 'building' ||
                      writeToIpfsMutation.isPending
                  )}
                  handlePreviewTxnsClick={async () => {
                    if (!cannonDefInfo?.def) return;
                    doBuild(
                      cannonDefInfo.def,
                      partialDeployInfo?.ipfsQuery.data?.deployInfo ??
                        prevCannonDeployInfo.ipfsQuery.data?.deployInfo,
                      onBuildSuccess
                    );
                  }}
                  isLoading={isCannonPackageLoading}
                  buildStatus={buildState.status}
                />

                {/* Build status */}
                <BuildStateAlerts
                  buildState={buildState}
                  buildStateMessage={buildState.message}
                  buildStateError={buildState.error}
                  deployer={deployer}
                />

                {/* Write to IPFS status*/}
                <WriteToIpfsStatus writeToIpfsMutation={writeToIpfsMutation} />

                {/* Txs list and Execution */}
                <SafeTransactionsAndExecution
                  buildState={buildState}
                  writeToIpfsMutation={writeToIpfsMutation}
                  cannonDefInfo={cannonDefInfo}
                  prevDeployLocation={prevDeployLocation}
                  gitInfo={gitInfo}
                  currentSafe={currentSafe}
                  ctx={ctx}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </FormProvider>
  );
}
