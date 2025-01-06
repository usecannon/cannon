import React from 'react';
import { Button } from '@/components/ui/button';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useSwitchChain } from 'wagmi';

interface WalletConnectionButtonsProps {
  isConnected: boolean;
  chainId: number | undefined;
  currentSafe: any;
  openConnectModal: ReturnType<typeof useConnectModal>['openConnectModal'];
  RenderPreviewButtonTooltip: () => React.ReactElement;
}

export function WalletConnectionButtons({
  isConnected,
  chainId,
  currentSafe,
  openConnectModal,
  RenderPreviewButtonTooltip,
}: WalletConnectionButtonsProps) {
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

  return <RenderPreviewButtonTooltip />;
}
