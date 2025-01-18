'use client';

import { links } from '@/constants/links';
import { useMultisendQuery } from '@/helpers/multisend';
import * as onchainStore from '@/helpers/onchain-store';
import { useStore } from '@/helpers/store';
import { useTxnStager } from '@/hooks/backend';
import { useDeployerWallet } from '@/hooks/deployer';
import {
  useCannonPackage,
  useCannonWriteDeployToIpfs,
  useMergedCannonDefInfo,
  useCannonFindUpgradeFromUrl,
  CannonWriteDeployToIpfsMutationResult,
  useCannonBuild,
} from '@/hooks/cannon';
import { useGitRefsList } from '@/hooks/git';
import { useGetPreviousGitInfoQuery } from '@/hooks/safe';
import { SafeTransaction } from '@/types/SafeTransaction';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import {
  ChainBuilderContext,
  DeploymentInfo,
  getIpfsUrl,
  PackageReference,
} from '@usecannon/builder';
import NextLink from 'next/link';
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
import { useAccount, useSwitchChain } from 'wagmi';
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
import { WalletConnectionButtons } from '@/features/Deploy/WalletConnectionButtons';
import { useToast } from '@/hooks/use-toast';
import { useForm, FormProvider } from 'react-hook-form';
import { useGitInfoFromCannonFileUrl } from '@/hooks/useGitInfoFromCannonFileUrl';

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

interface PrevDeploymentStatusProps {
  prevDeployLocation: string;
  tomlRequiresPrevPackage?: boolean;
}

function PrevDeploymentStatus({
  prevDeployLocation,
  tomlRequiresPrevPackage,
}: PrevDeploymentStatusProps) {
  return (
    <div className="flex flex-col mb-4">
      {prevDeployLocation ? (
        <Alert variant="info">
          <AlertDescription>
            Previous Deployment:{' '}
            <NextLink
              href={`/ipfs?cid=${prevDeployLocation.replace(
                'ipfs://',
                ''
              )}&compressed=true`}
              className="text-primary hover:underline"
              target="_blank"
            >
              {prevDeployLocation.replace('ipfs://', '')}
            </NextLink>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="info">
          <AlertDescription>
            {tomlRequiresPrevPackage
              ? 'We couldn\'t find a previous deployment for your cannonfile. Please, enter a value in the "Previous Package" input or modify your cannonfile to include a "deployers" key.'
              : 'Deployment from scratch'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function QueueFromGitOps() {
  const form = useForm();
  const router = useRouter();
  const currentSafe = useStore((s) => s.currentSafe)!;
  const settings = useStore((s) => s.settings);
  const { toast } = useToast();

  const { chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const deployer = useDeployerWallet(currentSafe?.chainId);

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

  const writeToIpfsMutation = useCannonWriteDeployToIpfs();
  const gitInfo = useGitInfoFromCannonFileUrl(cannonfileUrlInput);
  const partialDeployInfo = useCannonPackage(
    partialDeployIpfs ? `ipfs://${partialDeployIpfs}` : '',
    currentSafe?.chainId
  );
  const cannonDefInfo = useMergedCannonDefInfo(gitInfo, partialDeployInfo);

  const hasDeployers = useMemo(() => {
    return Boolean(cannonDefInfo?.def?.getDeployers()?.length);
  }, [cannonDefInfo?.def]);

  const cannonDefInfoError: string = gitInfo.gitUrl
    ? (cannonDefInfo?.error as any)?.toString()
    : cannonfileUrlInput &&
      'The format of your URL appears incorrect. Please double check and try again.';

  const pkgRef = useMemo(() => {
    return cannonDefInfo?.def?.getPackageRef(ctx);
  }, [cannonDefInfo?.def]);

  const onChainPrevPkgQuery = useCannonFindUpgradeFromUrl(
    pkgRef,
    currentSafe?.chainId,
    hasDeployers ? cannonDefInfo?.def?.getDeployers() : undefined,
    prevPackageInputRef || undefined
  );

  const prevDeployLocation = onChainPrevPkgQuery.data || '';

  const prevCannonDeployInfo = useCannonPackage(
    prevDeployLocation,
    currentSafe?.chainId
  );

  useEffect(() => {
    if (PackageReference.isValid(previousPackageInput)) {
      setPrevPackageInputRef(
        new PackageReference(previousPackageInput).fullPackageRef
      );
    } else if (getIpfsUrl(previousPackageInput)) {
      setPrevPackageInputRef(getIpfsUrl(previousPackageInput));
    } else {
      setPrevPackageInputRef(null);
    }
  }, [previousPackageInput]);

  // run the build and get the list of transactions we need to run
  const { buildState, doBuild, resetState } = useCannonBuild(currentSafe);

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

  // After loading the deployment info, set a default value for the upgradeFrom field
  useEffect(() => {
    if (hasDeployers || !nextCannonDeployInfo?.def) {
      return setPreviousPackageInput('');
    }

    const { name, preset } = nextCannonDeployInfo.def;
    const { fullPackageRef } = PackageReference.from(name, 'latest', preset);
    setPreviousPackageInput(fullPackageRef);
  }, [nextCannonDeployInfo, hasDeployers]);

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

  const refsInfo = useGitRefsList(gitInfo.gitUrl);
  const foundRef = refsInfo.refs?.find(
    (r) =>
      (r.ref.startsWith('refs/heads/') || r.ref.startsWith('refs/tags/')) &&
      r.ref.endsWith(gitInfo.gitRef)
  )?.oid;
  const gitHash = gitInfo.gitRef.match(/^[0-9a-f]+$/)
    ? foundRef || gitInfo.gitRef
    : foundRef;

  const prevInfoQuery = useGetPreviousGitInfoQuery(
    currentSafe as any,
    gitInfo.gitUrl + ':' + gitInfo.gitFile
  );

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

  const loadingDataForDeploy =
    prevCannonDeployInfo.isFetching ||
    partialDeployInfo?.isFetching ||
    onChainPrevPkgQuery.isFetching ||
    buildState.status === 'building' ||
    writeToIpfsMutationRes?.isLoading;

  const handlePreviewTxnsClick = useCallback(async () => {
    if (!isConnected) {
      if (openConnectModal) {
        openConnectModal();
      }
      toast({
        title:
          'In order to queue transactions, you must connect your wallet first.',
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    if (chainId !== currentSafe?.chainId) {
      try {
        await switchChainAsync({ chainId: currentSafe?.chainId || 10 });
      } catch (e) {
        toast({
          title:
            'Failed to switch chain, Your wallet must be connected to the same network as the selected Safe.',
          variant: 'destructive',
          duration: 5000,
        });
        return;
      }
    }

    doBuild(
      cannonDefInfo?.def,
      partialDeployInfo?.ipfsQuery.data?.deployInfo ??
        prevCannonDeployInfo.ipfsQuery.data?.deployInfo
    );
  }, [
    isConnected,
    chainId,
    currentSafe?.chainId,
    cannonDefInfo?.def,
    partialDeployInfo?.ipfsQuery.data?.deployInfo,
    prevCannonDeployInfo?.ipfsQuery.data?.deployInfo,
  ]);

  const tomlRequiresPrevPackage = useMemo(
    () =>
      Boolean(
        cannonfileUrlInput &&
          cannonDefInfo?.def &&
          !hasDeployers &&
          cannonDefInfo.def.allActionNames.some(
            (item) => item.startsWith('deploy.') || item.startsWith('contract.')
          )
      ),
    [cannonfileUrlInput, cannonDefInfo?.def, hasDeployers]
  );

  const canTomlBeDeployedUsingWebsite = useMemo(() => {
    if (!cannonDefInfo?.def) return false;

    // If there are no deployers defined and there are deploy/contract actions,
    // we can't deploy from website
    if (
      !hasDeployers &&
      cannonDefInfo.def.allActionNames.some(
        (item) => item.startsWith('deploy.') || item.startsWith('contract.')
      )
    ) {
      return false;
    }

    return true;
  }, [cannonDefInfo?.def, hasDeployers]);

  const disablePreviewButton = useMemo(() => {
    if (
      loadingDataForDeploy ||
      chainId !== currentSafe?.chainId ||
      !cannonDefInfo?.def
    ) {
      return true;
    }

    if (buildState.status === 'building' || buildState.status === 'success') {
      return true;
    }

    if (
      onChainPrevPkgQuery.isFetching &&
      !prevDeployLocation &&
      tomlRequiresPrevPackage &&
      !previousPackageInput
    ) {
      return true;
    }

    return !canTomlBeDeployedUsingWebsite;
  }, [
    loadingDataForDeploy,
    chainId,
    currentSafe?.chainId,
    cannonDefInfo?.def,
    buildState.status,
    onChainPrevPkgQuery.isFetching,
    prevDeployLocation,
    tomlRequiresPrevPackage,
    previousPackageInput,
    canTomlBeDeployedUsingWebsite,
  ]);

  const PreviewButton = useCallback(
    ({ message }: { message?: string }) => {
      const buttonText = loadingDataForDeploy
        ? 'Loading required data...'
        : 'Preview Transactions to Queue';

      return (
        <>
          <Button
            className="w-full"
            variant="default"
            disabled={disablePreviewButton}
            onClick={handlePreviewTxnsClick}
          >
            {buttonText}
          </Button>
          {disablePreviewButton && message && deploymentSourceInput && (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </>
      );
    },
    [loadingDataForDeploy, disablePreviewButton, deploymentSourceInput]
  );

  const RenderPreviewButtonTooltip = useCallback(() => {
    if (!chainId) {
      return (
        <PreviewButton message="You must connect your wallet to the same chain as the selected safe to continue" />
      );
    }

    if (chainId !== currentSafe?.chainId) {
      return (
        <PreviewButton message="Deployment Chain ID does not match Safe Chain ID" />
      );
    }

    if (partialDeployInfo?.isError) {
      const message = `Error fetching partial deploy info, error: ${partialDeployInfo.error?.message}`;
      return <PreviewButton message={message} />;
    }

    if (
      cannonDefInfo.isFetching ||
      prevCannonDeployInfo.isFetching ||
      onChainPrevPkgQuery.isFetching ||
      partialDeployInfo?.isFetching
    ) {
      return <PreviewButton message="Fetching package info, please wait..." />;
    }

    if (buildState.status === 'building') {
      return <PreviewButton message="Generating build info, please wait..." />;
    }

    if (!cannonDefInfo?.def) {
      return (
        <PreviewButton message="No cannonfile definition found, please input the link to the cannonfile to build" />
      );
    }

    return <PreviewButton />;
  }, [
    chainId,
    currentSafe?.chainId,
    partialDeployInfo?.isError,
    partialDeployInfo?.isFetching,
    partialDeployInfo.error?.message,
    prevCannonDeployInfo.isFetching,
    onChainPrevPkgQuery.isFetching,
    buildState.status,
    cannonDefInfo?.def,
    PreviewButton,
  ]);

  const handleDeploymentSourceInputChange = useCallback(
    (input: string) => {
      resetState();
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
    [resetState]
  );

  const cannonInfoDefinitionLoaded = useMemo(
    () =>
      Boolean(
        cannonfileUrlInput.length > 0 &&
          !cannonDefInfo.error &&
          cannonDefInfo?.def
      ),
    [cannonfileUrlInput, cannonDefInfo]
  );

  const partialDeployInfoLoaded = useMemo(
    () =>
      Boolean(
        !partialDeployInfo?.isFetching &&
          !partialDeployInfo?.isError &&
          partialDeployInfo?.ipfsQuery.data?.deployInfo
      ),
    [partialDeployInfo]
  );

  const buildStateMessage = buildState.message || null;
  const buildStateError = buildState.error || null;

  const renderAlert = useCallback(() => {
    if (settings.isIpfsGateway) {
      return (
        <Alert variant="destructive">
          <Cross2Icon className="h-4 w-4 mr-3" />
          <AlertDescription>
            Your current IPFS URL is set to a gateway. Update your IPFS URL to
            an API endpoint where you can pin files in{' '}
            <NextLink href="/settings" className="text-primary hover:underline">
              settings
            </NextLink>
            .
          </AlertDescription>
        </Alert>
      );
    }

    if (cannonDefInfo?.def && cannonDefInfo.def.danglingDependencies.size > 0) {
      return (
        <Alert variant="destructive">
          <Cross2Icon className="h-4 w-4 mr-3" />
          <AlertDescription>
            <div className="flex flex-col">
              <p>
                The cannonfile contains invalid dependencies. Please ensure the
                following references are defined:
              </p>
              <div>
                {Array.from(cannonDefInfo.def.danglingDependencies).map(
                  (dependency) => (
                    <React.Fragment key={dependency}>
                      <span className="font-mono">{dependency}</span>
                      <br />
                    </React.Fragment>
                  )
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }, [settings.isIpfsGateway, cannonDefInfo?.def]);

  return (
    <FormProvider {...form}>
      <div className="container py-8 max-w-3xl">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Queue Deployment</h2>
            <div className="mb-4">
              <DeploymentSourceInput
                deploymentSourceInput={deploymentSourceInput}
                setDeploymentSourceInput={setDeploymentSourceInput}
                selectedDeployType={selectedDeployType}
                cannonfileUrlInput={cannonfileUrlInput}
                cannonDefInfo={cannonDefInfo}
                cannonInfoDefinitionLoaded={cannonInfoDefinitionLoaded}
                partialDeployInfo={partialDeployInfo}
                partialDeployInfoLoaded={partialDeployInfoLoaded}
                chainId={chainId}
                currentSafe={currentSafe}
                cannonDefInfoError={cannonDefInfoError}
                inputError={inputError}
                handleDeploymentSourceInputChange={
                  handleDeploymentSourceInputChange
                }
              />
            </div>
            {selectedDeployType == 'git' && onChainPrevPkgQuery.isFetched && (
              <PrevDeploymentStatus
                prevDeployLocation={prevDeployLocation}
                tomlRequiresPrevPackage={tomlRequiresPrevPackage}
              />
            )}
            {(partialDeployInfoLoaded || tomlRequiresPrevPackage) && (
              <div className="mb-4">
                <PreviousPackageInput
                  previousPackageInput={previousPackageInput}
                  setPreviousPackageInput={setPreviousPackageInput}
                  prevCannonDeployInfo={prevCannonDeployInfo}
                  onChainPrevPkgQuery={onChainPrevPkgQuery}
                />
              </div>
            )}
            {selectedDeployType == 'partial' &&
              partialDeployIpfs.length > 0 &&
              partialDeployInfoLoaded && (
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
            {renderAlert()}
            <WalletConnectionButtons
              isConnected={isConnected}
              chainId={chainId}
              currentSafe={currentSafe}
              openConnectModal={openConnectModal}
              RenderPreviewButtonTooltip={RenderPreviewButtonTooltip}
            />
            <BuildStateAlerts
              buildState={buildState}
              buildStateMessage={buildStateMessage}
              buildStateError={buildStateError}
              deployer={deployer}
            />
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
