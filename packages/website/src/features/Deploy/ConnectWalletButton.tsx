import { Button } from '@/components/ui/button';
import React from 'react';
import { useSwitchChain } from 'wagmi';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

export function ConnectWalletButton({
  currentSafeChainId,
}: {
  currentSafeChainId: number;
}) {
  const { chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
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

  if (chainId !== currentSafeChainId) {
    return (
      <Button
        className="w-full"
        onClick={() => switchChainAsync({ chainId: currentSafeChainId || 10 })}
      >
        Switch Network
      </Button>
    );
  }

  return null;
}
