import { http, createConfig, Config } from '@wagmi/core';
import { mainnet, sepolia } from 'wagmi/chains';
import { mock } from 'wagmi/connectors';

let instance: Config | null = null;

export const getE2eWagmiConfig = () => {
  if (!instance) {
    instance = createConfig({
      chains: [mainnet, sepolia],
      connectors: [
        mock({
          // owned-greeter owner
          accounts: ['0xd73fc008Ff537F42c7A688b686Fe91227bE0e08F'],
        }),
      ],
      transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
      },
    });
  }
  return instance;
};
