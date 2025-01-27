import React from 'react';
import { Button } from '@/components/ui/button';
import { useSwitchChain } from 'wagmi';
import { useCannonPackage, useMergedCannonDefInfo } from '@/hooks/cannon';
import { SafeDefinition } from '@/helpers/store';

function PreviewButton({
  isDeploying,
  handlePreviewTxnsClick,
  isLoading,
  buildStatus,
}: {
  isDeploying: boolean;
  handlePreviewTxnsClick: () => Promise<void>;
  cannonDefInfo?: ReturnType<typeof useMergedCannonDefInfo>;
  partialDeployInfo?: ReturnType<typeof useCannonPackage>;
  isLoading: boolean;
  buildStatus: string;
}) {
  const isDisabled = isLoading || buildStatus === 'success';

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
  partialDeployInfo,
  cannonDefInfo,
  handlePreviewTxnsClick,
  buildStatus,
}: {
  isConnected: boolean;
  chainId?: number;
  currentSafe: SafeDefinition;
  openConnectModal?: () => void;
  isDeploying: boolean;
  isLoading: boolean;
  partialDeployInfo?: ReturnType<typeof useCannonPackage>;
  cannonDefInfo?: ReturnType<typeof useMergedCannonDefInfo>;
  handlePreviewTxnsClick: () => Promise<void>;
  buildStatus: string;
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
      handlePreviewTxnsClick={handlePreviewTxnsClick}
      cannonDefInfo={cannonDefInfo}
      partialDeployInfo={partialDeployInfo}
      isLoading={isLoading}
      buildStatus={buildStatus}
    />
  );
}
