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
      '0xC06ABfc95f5BD6D38e94A182Cdd37590FB5d178c';

    config.cannon = { registryAddress };
  }
);
