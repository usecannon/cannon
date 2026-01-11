import { CANNON_CHAIN_ID } from '@usecannon/builder';
import { HttpNetworkUserConfig } from 'hardhat/types/config';
import type { ConfigHooks } from "hardhat/types/hooks";

export default async (): Promise<Partial<ConfigHooks>> => {
  const handlers: Partial<ConfigHooks> = {
    async extendUserConfig(config, next) {
        next(config);

        if (!config.networks) {
            config.networks = {};
        }

        config.networks.cannon = {
          ...(config.networks?.hardhat || {}),
          ...(config.networks?.cannon || {}),
          chainId: CANNON_CHAIN_ID,
          url: `http://127.0.0.1:8545`
        } as HttpNetworkUserConfig;

        return config;
      }
  };

  return handlers;
};