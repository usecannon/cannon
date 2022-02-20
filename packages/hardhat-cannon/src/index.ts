import '@nomiclabs/hardhat-ethers';

import './tasks/cannon';
import './tasks/build';
import './tasks/publish';
import './subtasks/download';
import './subtasks/load-deploy';
import './type-extensions';

import { HardhatConfig, HardhatUserConfig } from 'hardhat/types';
import { extendConfig } from 'hardhat/config';

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    config.cannon = {
      registryEndpoint:
        userConfig.cannon?.registryEndpoint ||
        'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',

      // TODO: grab default value from registry/deployments/${network}.json file
      registryAddress:
        userConfig.cannon?.registryAddress ||
        '0x805519fE0Aa8903F2CA72835A3A1FA3d0a17D5A2',

      publisherPrivateKey: userConfig.cannon?.publisherPrivateKey,

      ipfsConnection: userConfig.cannon?.ipfsConnection || {
        url: 'http://127.0.0.1:5001/api/v0',
      },
    };
  }
);
