import path from 'path';
import { HardhatConfig, HardhatRuntimeEnvironment, HardhatUserConfig } from 'hardhat/types';
import { extendConfig, extendEnvironment } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';
import { CANNON_CHAIN_ID, getSavedPackagesDir } from '@usecannon/builder';
import {
  DEFAULT_CANNON_DIRECTORY,
  DEFAULT_REGISTRY_ADDRESS,
  DEFAULT_REGISTRY_ENDPOINT,
  DEFAULT_REGISTRY_IPFS_ENDPOINT,
} from '@usecannon/cli';
import { augmentProvider } from './internal/augment-provider';

import './tasks/build';
import './tasks/deploy';
import './tasks/export';
import './tasks/import';
import './tasks/inspect';
import './tasks/packages';
import './tasks/publish';
import './tasks/run';
import './tasks/verify';
import './subtasks/load-deploy';
import './subtasks/rpc';
import './type-extensions';

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  config.paths.deployments = userConfig.paths?.deployments
    ? path.resolve(config.paths.root, userConfig.paths.deployments)
    : path.join(config.paths.root, 'deployments');

  config.paths.cannon = userConfig.paths?.cannon
    ? path.resolve(config.paths.root, userConfig.paths.cannon)
    : getSavedPackagesDir();

  config.cannon = {
    cannonDirectory: userConfig.cannon?.cannonDirectory || DEFAULT_CANNON_DIRECTORY,
    registryEndpoint: userConfig.cannon?.registryEndpoint || DEFAULT_REGISTRY_ENDPOINT,
    registryAddress: userConfig.cannon?.registryAddress || DEFAULT_REGISTRY_ADDRESS,
    ipfsEndpoint: userConfig.cannon?.ipfsEndpoint || DEFAULT_REGISTRY_IPFS_ENDPOINT,
    ipfsAuthorizationHeader: userConfig.cannon?.ipfsAuthorizationHeader,
  };

  config.networks.cannon = {
    port: 8545,
    ...(config.networks?.hardhat || {}),
    ...(userConfig.networks?.cannon || {}),
    chainId: CANNON_CHAIN_ID,
  } as any;
});

extendEnvironment((env: HardhatRuntimeEnvironment) => {
  augmentProvider(env);
});
