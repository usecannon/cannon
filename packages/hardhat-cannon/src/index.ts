import path from 'path';
import '@nomiclabs/hardhat-ethers';

import './tasks/build';
import './tasks/verify';
import './tasks/publish';
import './tasks/import';
import './tasks/export';
import './tasks/inspect';
import './subtasks/load-deploy';
import './subtasks/rpc';
import './subtasks/write-deployments';
import './type-extensions';

import { getSavedPackagesDir } from '@usecannon/builder';

import { HardhatConfig, HardhatRuntimeEnvironment, HardhatUserConfig } from 'hardhat/types';
import { extendConfig, extendEnvironment } from 'hardhat/config';
import { augmentProvider } from './internal/augment-provider';

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  config.paths.deployments = userConfig.paths?.deployments
    ? path.resolve(config.paths.root, userConfig.paths.deployments)
    : path.join(config.paths.root, 'deployments');

  config.paths.cannon = userConfig.paths?.cannon
    ? path.resolve(config.paths.root, userConfig.paths.cannon)
    : getSavedPackagesDir();

  config.cannon = {
    registryEndpoint: userConfig.cannon?.registryEndpoint || 'https://cloudflare-eth.com/v1/mainnet',

    registryAddress: userConfig.cannon?.registryAddress || '0xA98BE35415Dd28458DA4c1C034056766cbcaf642',

    ipfsConnection: userConfig.cannon?.ipfsConnection || {
      url: 'https://usecannon.infura-ipfs.io',
    },
  };

  config.networks.cannon = {
    ...config.networks?.hardhat,
    ...(userConfig.networks?.cannon || { port: 8545 }),
  } as any;
});

extendEnvironment((env: HardhatRuntimeEnvironment) => {
  augmentProvider(env);
});
