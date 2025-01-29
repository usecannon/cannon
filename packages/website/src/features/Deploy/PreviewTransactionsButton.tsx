import { Button } from '@/components/ui/button';
import { useCannonPackage, useMergedCannonDefInfo } from '@/hooks/cannon';
import { SafeDefinition } from '@/helpers/store';
import { useAccount } from 'wagmi';

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
  isDeploying,
  isLoading,
  partialDeployInfo,
  cannonDefInfo,
  currentSafe,
  handlePreviewTxnsClick,
  buildStatus,
}: {
  currentSafe: SafeDefinition;
  isDeploying: boolean;
  isLoading: boolean;
  partialDeployInfo?: ReturnType<typeof useCannonPackage>;
  cannonDefInfo?: ReturnType<typeof useMergedCannonDefInfo>;
  handlePreviewTxnsClick: () => Promise<void>;
  buildStatus: string;
}) {
  const { chainId, isConnected } = useAccount();

  if (!isConnected || chainId !== currentSafe.chainId) {
    return null;
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
