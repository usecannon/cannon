import '@nomiclabs/hardhat-ethers';

import './tasks/cannon';
import './tasks/build';
import './tasks/publish';
import './subtasks/load-deploy';
import './type-extensions';

import { HardhatConfig, HardhatUserConfig } from 'hardhat/types';
import { extendConfig } from 'hardhat/config';

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    // TODO: grab default value from registry/deployments/${network}.json file
    const registryAddress =
      userConfig.cannon?.registryAddress ||
      '0x805519fE0Aa8903F2CA72835A3A1FA3d0a17D5A2';

    config.cannon = { registryAddress };
  }
);
