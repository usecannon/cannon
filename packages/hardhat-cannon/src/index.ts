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

import { HardhatConfig, HardhatUserConfig } from 'hardhat/types';
import { extendConfig } from 'hardhat/config';

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  config.paths.deployments = userConfig.paths?.deployments
    ? path.resolve(config.paths.root, userConfig.paths.deployments)
    : path.join(config.paths.root, 'deployments');

  config.paths.cannon = userConfig.paths?.cannon
    ? path.resolve(config.paths.root, userConfig.paths.cannon)
    : path.join(config.paths.root, 'cannon');

  config.cannon = {
    registryEndpoint: userConfig.cannon?.registryEndpoint || 'https://mainnet.infura.io/v3/2ec6e503197e468ca2f04b8a017ee1b0',

    registryAddress: userConfig.cannon?.registryAddress || '0x89EA2506FDad3fB5EF7047C3F2bAac1649A97650',

    publisherPrivateKey: userConfig.cannon?.publisherPrivateKey,

    ipfsConnection: userConfig.cannon?.ipfsConnection || {
      url: 'https://usecannon.infura-ipfs.io',
    },
  };
});
