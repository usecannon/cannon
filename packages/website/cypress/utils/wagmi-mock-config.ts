import { Config, createConfig, http } from '@wagmi/core';
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
        [mainnet.id]: http(process.env.NEXT_PUBLIC_CANNON_E2E_RPC_URL_ETHEREUM),
        [sepolia.id]: http(process.env.NEXT_PUBLIC_CANNON_E2E_RPC_URL_SEPOLIA),
      },
    });
  }
  return instance;
};
