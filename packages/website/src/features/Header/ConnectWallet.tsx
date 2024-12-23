'use client';

import { FC, ReactNode, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ChainSelectorModal from '@/components/ChainSelectorModal';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from 'usehooks-ts';
import { cn } from '@/lib/utils';

const styleMap = {
  primary: 'bg-teal-900 border-teal-500 hover:bg-teal-800',
  danger: 'bg-red-900 border-red-500 hover:bg-red-800',
  default: 'bg-gray-900 border-gray-500 hover:bg-gray-800',
};

const CustomButton = ({
  onClick,
  children,
  variant,
}: {
  onClick: () => void;
  children: ReactNode;
  variant: keyof typeof styleMap;
}) => (
  <Button
    size="sm"
    variant="outline"
    onClick={onClick}
    className={cn(
      'uppercase tracking-wider font-miriam text-[15px] text-gray-200',
      'shadow-[0px_0px_4px_rgba(255,255,255,0.33)]',
      styleMap[variant]
    )}
  >
    {children}
  </Button>
);

const ConnectWallet: FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [showingChainModal, setShowingChainModal] = useState(false);

  const handleOpenChainModal = () => {
    setShowingChainModal(true);
  };

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              className: 'opacity-0 pointer-events-none select-none',
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <CustomButton variant="primary" onClick={openConnectModal}>
                    Connect
                  </CustomButton>
                );
              }

              if (chain.unsupported) {
                return (
                  <CustomButton variant="danger" onClick={handleOpenChainModal}>
                    Wrong Network
                  </CustomButton>
                );
              }

              return (
                <div className="flex gap-4">
                  {!isMobile && (
                    <CustomButton
                      onClick={handleOpenChainModal}
                      variant="default"
                    >
                      {chain.hasIcon && (
                        <div
                          className="w-3.5 h-3.5 rounded-full overflow-hidden mr-1.5 -mt-px"
                          style={{
                            background: chain.iconBackground,
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              className="w-3.5 h-3.5"
                            />
                          )}
                        </div>
                      )}
                      {chain.name}
                    </CustomButton>
                  )}

                  <CustomButton onClick={openAccountModal} variant="default">
                    {account.displayName}
                  </CustomButton>
                </div>
              );
            })()}
            <ChainSelectorModal
              onClose={() => setShowingChainModal(false)}
              isOpen={showingChainModal}
            />
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default ConnectWallet;
