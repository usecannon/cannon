import path from 'path';
import '@nomiclabs/hardhat-ethers';

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
import './subtasks/write-deployments';
import './type-extensions';

import { getSavedPackagesDir } from '@usecannon/builder';

import { HardhatConfig, HardhatUserConfig } from 'hardhat/types';
import { extendConfig } from 'hardhat/config';
import {
  DEFAULT_CANNON_DIRECTORY,
  DEFAULT_REGISTRY_ADDRESS,
  DEFAULT_REGISTRY_ENDPOINT,
  DEFAULT_REGISTRY_IPFS_ENDPOINT,
} from '@usecannon/cli/dist/src/constants';

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
});
