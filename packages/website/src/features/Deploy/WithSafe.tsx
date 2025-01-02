import { ReactNode } from 'react';
import { useStore } from '@/helpers/store';
import { useAccount, useBytecode } from 'wagmi';
import PrepareNetwork from './PrepareNetwork';
import * as onchainStore from '../../helpers/onchain-store';
import * as multicallForwarder from '../../helpers/trusted-multicall-forwarder';
import MainContentLoading from '@/components/MainContentLoading';

export default function WithSafe({ children }: { children: ReactNode }) {
  const currentSafe = useStore((s) => s.currentSafe);
  // Uncomment the following line to use test with local network
  // const currentSafe = { chainId: 31337 };
  const { isConnected } = useAccount();

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

  return (
    <div className="flex flex-col min-h-[calc(100dvh-var(--header-height)-var(--subheader-height)-var(--footer-height))]">
      {currentSafe ? (
        isLoadingNetworkPrepared ? (
          <MainContentLoading />
        ) : isNetworkPrepared ? (
          children
        ) : (
          <PrepareNetwork onNetworkPrepared={handleNetworkPrepared} />
        )
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-3 flex-1 bg-black/60">
          <p className="text-lg text-gray-200 mb-2">
            Queue, sign, and execute deployments using a
            <a
              href="https://safe.global/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mx-2 text-gray-200 no-underline hover:no-underline translate-y-[3px] opacity-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="h-[18px] object-cover"
                src="/images/safe.svg"
                alt="Safe"
              />
            </a>
          </p>
          <p className="text-gray-300 text-xs tracking-[0.2px]">
            {isConnected ? 'S' : 'Connect a wallet and s'}elect a Safe from the
            dropdown above.
          </p>
        </div>
      )}
    </div>
  );
}
