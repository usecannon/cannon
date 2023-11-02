import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import * as Chains from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { infuraProvider } from 'wagmi/providers/infura';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { ReactNode, useEffect, useState } from 'react';
import _ from 'lodash';
import { useStore } from '@/helpers/store';

const cannonLocalHost = {
  ...Chains.localhost,
  id: 13370,
  name: 'Cannon Localhost',
  rpcUrl: 'http://127.0.0.1:8545',
};
const _chains = Object.values(Chains).filter((item) => _.isObject(item));
export const supportedChains = [..._chains, cannonLocalHost];

const createWagmiConfig = (customProviders: string[]) => {
  const providers = [];

  for (const customProvider of customProviders) {
    if (customProvider.includes('infura')) {
      const splitted = customProvider.split('/');
      providers.push(
        infuraProvider({
          apiKey: splitted[splitted.length - 1],
        })
      );
    } else if (customProvider.includes('alchemy')) {
      const splitted = customProvider.split('/');
      providers.push(
        alchemyProvider({
          apiKey: splitted[splitted.length - 1],
        })
      );
    }
  }

  const { chains, publicClient, webSocketPublicClient } = configureChains(
    supportedChains,
    [...(providers as any), publicProvider()]
  );

  const { connectors } = getDefaultWallets({
    appName: 'Cannon',
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
    chains,
  });

  const config = createConfig({
    autoConnect: true,
    connectors,
    publicClient,
    webSocketPublicClient,
  });

  return { config, chains };
};

const { config: defaultWagmiConfig, chains: defaultWagmiChains } =
  createWagmiConfig([]);

function WalletProvider({ children }: { children: ReactNode }) {
  const [wagmiConfig, setWagmiConfig] = useState(defaultWagmiConfig);
  const [rainbowKitChains, setRainbowKitChains] = useState(defaultWagmiChains);
  const settings = useStore((s) => s.settings);

  useEffect(() => {
    const { config, chains } = createWagmiConfig(settings.customProviders);
    setRainbowKitChains(chains);
    setWagmiConfig(config);
  }, [settings.customProviders]);

  // NOTE: have to hack the style below becuase otherwise it overflows the page.
  // hopefully the class name doesnt change from compile to compile lol
  // related issue: https://github.com/rainbow-me/rainbowkit/issues/1007
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={rainbowKitChains} theme={darkTheme()}>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            div.ju367v1i {
              max-height: 90vh;
              overflow: auto;
            }
          `,
          }}
        />
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default WalletProvider;
