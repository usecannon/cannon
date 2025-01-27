import React from 'react';
import { Button } from '@/components/ui/button';
import { useSwitchChain } from 'wagmi';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCannonPackage, useMergedCannonDefInfo } from '@/hooks/cannon';
import { SafeDefinition } from '@/helpers/store';

function PreviewButton({
  isDeploying,
  deploymentSourceInput,
  handlePreviewTxnsClick,
  isLoading,
  buildStatus,
  error,
}: {
  isDeploying: boolean;
  deploymentSourceInput: string;
  handlePreviewTxnsClick: () => Promise<void>;
  cannonDefInfo?: ReturnType<typeof useMergedCannonDefInfo>;
  partialDeployInfo?: ReturnType<typeof useCannonPackage>;
  isLoading: boolean;
  buildStatus: string;
  error: string | null;
}) {
  const isDisabled = isLoading || Boolean(error) || buildStatus === 'success';

  const buttonText = isDeploying
    ? 'Loading required data...'
    : 'Preview Transactions to Queue';

  return (
    <>
      <Button
        className="w-full"
        variant="default"
        disabled={isDisabled}
        onClick={handlePreviewTxnsClick}
      >
        {buttonText}
      </Button>
      {error && deploymentSourceInput && (
        <Alert className="mt-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
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
  isDeploying,
  isLoading,
  deploymentSourceInput,
  partialDeployInfo,
  cannonDefInfo,
  handlePreviewTxnsClick,
  buildStatus,
  error,
}: {
  isConnected: boolean;
  chainId?: number;
  currentSafe: SafeDefinition;
  openConnectModal?: () => void;
  isDeploying: boolean;
  isLoading: boolean;
  deploymentSourceInput: string;
  partialDeployInfo?: ReturnType<typeof useCannonPackage>;
  cannonDefInfo?: ReturnType<typeof useMergedCannonDefInfo>;
  handlePreviewTxnsClick: () => Promise<void>;
  buildStatus: string;
  error: string | null;
}) {
  const { switchChainAsync } = useSwitchChain();

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

  return (
    <PreviewButton
      isDeploying={isDeploying}
      deploymentSourceInput={deploymentSourceInput}
      handlePreviewTxnsClick={handlePreviewTxnsClick}
      cannonDefInfo={cannonDefInfo}
      partialDeployInfo={partialDeployInfo}
      isLoading={isLoading}
      buildStatus={buildStatus}
      error={error}
    />
  );
}
