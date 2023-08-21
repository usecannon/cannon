import { FC, ReactNode } from 'react';
import { Button, Flex } from '@chakra-ui/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const styleMap = {
  primary: {
    background: 'teal.900',
    borderColor: 'teal.500',
    _hover: {
      bg: 'teal.800',
    },
  },
  danger: {
    background: 'red.900',
    borderColor: 'red.500',
    _hover: {
      bg: 'red.800',
    },
  },
  default: {
    background: 'gray.900',
    borderColor: 'gray.500',
    _hover: {
      background: 'gray.800',
    },
  },
};

const CustomButton = ({
  onClick,
  children,
  variant,
}: {
  onClick: () => void;
  children: ReactNode;
  variant: string;
}) => (
  <Button
    size="sm"
    variant="outline"
    colorScheme="black"
    fontWeight={500}
    textTransform="uppercase"
    letterSpacing="1px"
    fontFamily="var(--font-miriam)"
    textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
    fontSize="15px"
    color="gray.200"
    {...styleMap[variant as keyof typeof styleMap]}
    onClick={onClick}
  >
    {children}
  </Button>
);

export const ConnectWallet: FC = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
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
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
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
                  <CustomButton variant="danger" onClick={openChainModal}>
                    Wrong Network
                  </CustomButton>
                );
              }

              return (
                <Flex gap={4}>
                  <CustomButton onClick={openChainModal} variant="default">
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 6,
                          marginTop: -1,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 14, height: 14 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </CustomButton>

                  <CustomButton onClick={openAccountModal} variant="default">
                    {account.displayName}
                    {/* account.displayBalance
                      ? ` (${account.displayBalance})`
                        : '' */}
                  </CustomButton>
                </Flex>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};
