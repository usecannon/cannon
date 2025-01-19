import React from 'react';
import { Button } from '@/components/ui/button';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useSwitchChain } from 'wagmi';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SafeDefinition } from '@/helpers/store';
import {
  useCannonFindUpgradeFromUrl,
  useCannonPackage,
  useMergedCannonDefInfo,
} from '@/hooks/cannon';

function PreviewButton({
  message,
  loadingDataForDeploy,
  disablePreviewButton,
  deploymentSourceInput,
  handlePreviewTxnsClick,
}: {
  message?: string;
  loadingDataForDeploy: boolean;
  disablePreviewButton: boolean;
  deploymentSourceInput: string;
  handlePreviewTxnsClick: () => Promise<void>;
}) {
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
}

export function PreviewTransactionsButton({
  isConnected,
  chainId,
  currentSafe,
  openConnectModal,
  loadingDataForDeploy,
  deploymentSourceInput,
  partialDeployInfo,
  cannonDefInfo,
  prevCannonDeployInfo,
  onChainPrevPkgQuery,
  canTomlBeDeployedUsingWebsite,
  handlePreviewTxnsClick,
}: {
  isConnected: boolean;
  chainId: number | undefined;
  currentSafe: SafeDefinition;
  openConnectModal: ReturnType<typeof useConnectModal>['openConnectModal'];
  loadingDataForDeploy: boolean;
  deploymentSourceInput: string;
  partialDeployInfo: ReturnType<typeof useCannonPackage>;
  cannonDefInfo: ReturnType<typeof useMergedCannonDefInfo>;
  prevCannonDeployInfo: ReturnType<typeof useCannonPackage>;
  onChainPrevPkgQuery: ReturnType<typeof useCannonFindUpgradeFromUrl>;
  canTomlBeDeployedUsingWebsite: boolean;
  handlePreviewTxnsClick: () => Promise<void>;
}) {
  const { switchChainAsync } = useSwitchChain();

  const getButtonState = (): {
    shouldDisable: boolean;
    message?: string;
  } => {
    if (partialDeployInfo?.isError) {
      return {
        shouldDisable: true,
        message: `Error fetching partial deploy info, error: ${partialDeployInfo.error?.message}`,
      };
    }

    const isFetching =
      cannonDefInfo.isFetching ||
      prevCannonDeployInfo.isFetching ||
      onChainPrevPkgQuery.isFetching ||
      partialDeployInfo?.isFetching ||
      loadingDataForDeploy;

    if (isFetching) {
      return {
        shouldDisable: true,
      };
    }

    if (!canTomlBeDeployedUsingWebsite) {
      return {
        shouldDisable: true,
        message:
          'This cannonfile can no be deployed using the UI. Please use the CLI to deploy.',
      };
    }

    /* 
     * Seems not to be required as onChainPrevPkgQuery.isFetching is already checked
    if (
      onChainPrevPkgQuery.isFetching &&
      !prevDeployLocation &&
      tomlRequiresPrevPackage &&
      !previousPackageInput
    ) {
      return true;
    } 
      
    */

    /*  BUiLDING...
    
    if (buildState.status === 'building') {
      return {
        shouldDisable: true,
        message: 'Generating build info, please wait...',
      };
    } 
      
    if (buildState.status === 'building' || buildState.status === 'success') {
      return true;
    }

    */

    if (!cannonDefInfo?.def) {
      return {
        shouldDisable: true,
        message:
          'No cannonfile definition found, please input the link to the cannonfile to build',
      };
    }

    return {
      shouldDisable: false,
    };
  };

  if (!isConnected) {
    return (
      <Button
        className="w-full"
        onClick={() => openConnectModal && openConnectModal()}
      >
        Connect wallet
      </Button>
    );
  }

  if (chainId !== currentSafe?.chainId) {
    return (
      <Button
        className="w-full"
        onClick={() =>
          switchChainAsync({ chainId: currentSafe?.chainId || 10 })
        }
      >
        Switch Network
      </Button>
    );
  }

  const buttonState = getButtonState();

  return (
    <PreviewButton
      message={buttonState.message}
      loadingDataForDeploy={loadingDataForDeploy}
      disablePreviewButton={buttonState.shouldDisable}
      deploymentSourceInput={deploymentSourceInput}
      handlePreviewTxnsClick={handlePreviewTxnsClick}
    />
  );
}
