import { ReactNode } from 'react';
import { useStore } from '@/helpers/store';
import { useAccount, useBytecode } from 'wagmi';
import PrepareNetwork from './PrepareNetwork';
import * as onchainStore from '../../helpers/onchain-store';
import * as multicallForwarder from '../../helpers/trusted-multicall-forwarder';
import MainContentLoading from '@/components/MainContentLoading';
import { motion } from 'framer-motion';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { SafeAddressInput } from './SafeAddressInput';

export default function WithSafe({ children }: { children: ReactNode }) {
  const currentSafe = useStore((s) => s.currentSafe);

  const onchainStoreBytecode = useBytecode({
    chainId: currentSafe?.chainId,
    address: onchainStore.deployAddress,
  });

  const multicallForwarderBytecode = useBytecode({
    chainId: currentSafe?.chainId,
    address: multicallForwarder.deployAddress,
  });

  const isNetworkPrepared =
    (onchainStoreBytecode?.data?.length || 0) > 0 &&
    (multicallForwarderBytecode?.data?.length || 0) > 0;

  const isLoadingNetworkPrepared =
    onchainStoreBytecode.isPending || multicallForwarderBytecode.isPending;

  const handleNetworkPrepared = async () => {
    // Refresh bytecode
    await onchainStoreBytecode.refetch();
    await multicallForwarderBytecode.refetch();
  };

  if (!currentSafe) {
    return (
      <div className="h-screen max-h-[calc(100vh-var(--header-height)-var(--subheader-height)-var(--footer-height))]">
        <SelectSafeMessage />
      </div>
    );
  }

  return isLoadingNetworkPrepared ? (
    <div className="flex flex-col">
      <MainContentLoading />
    </div>
  ) : isNetworkPrepared ? (
    <div className="max-h-[calc(100vh-var(--header-height)-var(--subheader-height)-var(--footer-height))]">
      {children}
    </div>
  ) : (
    <div className="flex flex-col">
      <PrepareNetwork onNetworkPrepared={handleNetworkPrepared} />
    </div>
  );
}

function SelectSafeMessage() {
  // Uncomment the following line to use test with local network
  // const currentSafe = { chainId: 31337 };
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-3 flex-1 bg-black/60">
      <motion.svg
        width="128px"
        height="128px"
        viewBox="0 0 39 40"
        fill="none"
        animate={{
          scale: [1, 1.04, 1],
          opacity: [0.6, 0.8, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <path
          d="M2.22855 19.5869H6.35167C7.58312 19.5869 8.58087 20.6155 8.58087 21.8847V28.0535C8.58087 29.3227 9.57873 30.3513 10.8101 30.3513H27.2131C28.4445 30.3513 29.4424 31.3798 29.4424 32.6492V36.8993C29.4424 38.1685 28.4445 39.1971 27.2131 39.1971H9.86067C8.62922 39.1971 7.6457 38.1685 7.6457 36.8993V33.4893C7.6457 32.2201 6.64783 31.3196 5.41638 31.3196H2.22938C0.99805 31.3196 0.000190262 30.2911 0.000190262 29.0217V21.8581C0.000190262 20.5888 0.997223 19.5869 2.22855 19.5869Z"
          fill="white"
        />
        <path
          d="M29.4429 11.1437C29.4429 9.87434 28.4451 8.84578 27.2136 8.84578H10.8207C9.58924 8.84578 8.5915 7.81722 8.5915 6.54797V2.29787C8.5915 1.02853 9.58924 0 10.8207 0H28.164C29.3953 0 30.3932 1.02853 30.3932 2.29787V5.57274C30.3932 6.84199 31.3909 7.87055 32.6224 7.87055H35.7952C37.0266 7.87055 38.0244 8.89911 38.0244 10.1685V17.3398C38.0244 18.6092 37.0224 19.5861 35.791 19.5861H31.668C30.4365 19.5861 29.4387 18.5576 29.4387 17.2883L29.4429 11.1437Z"
          fill="white"
        />
        <path
          d="M20.9524 15.1196H16.992C15.7013 15.1196 14.6543 16.1997 14.6543 17.5293V21.6117C14.6543 22.942 15.7021 24.0212 16.992 24.0212H20.9524C22.243 24.0212 23.29 22.9411 23.29 21.6117V17.5293C23.29 16.1989 22.2422 15.1196 20.9524 15.1196Z"
          fill="white"
        />
      </motion.svg>
      <p className="text-lg text-gray-200 mt-7 mb-2">
        Queue, sign, and execute deployments
      </p>
      <p className="text-gray-300 text-sm tracking-[0.2px]">
        {isConnected ? (
          <div className="mt-2">
            <SafeAddressInput />
          </div>
        ) : (
          <>
            <Button
              variant="link"
              onClick={openConnectModal}
              className="text-gray-300 text-sm tracking-[0.2px] p-0 h-auto font-normal hover:text-gray-100 underline"
            >
              Connect a wallet
            </Button>
            {' and select a Safe'}
          </>
        )}
      </p>
    </div>
  );
}
