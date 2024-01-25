import { CANNON_CHAIN_ID } from '@usecannon/builder';
import { extendConfig, extendEnvironment } from 'hardhat/config';
import { HardhatConfig, HardhatRuntimeEnvironment, HardhatUserConfig } from 'hardhat/types';
import path from 'path';
import './tasks/alter';
import './tasks/build';
import './tasks/inspect';
import './subtasks/get-artifact-data';
import './subtasks/load-package-definition';
import './type-extensions';

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  config.paths.deployments = userConfig.paths?.deployments
    ? path.resolve(config.paths.root, userConfig.paths.deployments)
    : path.join(config.paths.root, 'deployments');

  config.cannon = {
    publicSourceCode: userConfig.cannon?.publicSourceCode || false,
  };

  config.networks.cannon = {
    port: 8545,
    ...(config.networks?.hardhat || {}),
    ...(userConfig.networks?.cannon || {}),
    chainId: CANNON_CHAIN_ID,
  } as any;

  if (!config.networks.cannon.url) {
    config.networks.cannon.url = `http://127.0.0.1:${config.networks.cannon.port}`;
  }
});

extendEnvironment(async (hre: HardhatRuntimeEnvironment) => {
  if (!(hre as any).ethers) {
    throw new Error(
      'Missing ethers.js installation. Install it with:\n  npm install --save-dev @nomicfoundation/hardhat-ethers ethers'
    );
  }

  if (hre.network.name === 'hardhat' && (hre as any).ethers.version.startsWith('6.')) {
    throw new Error("Cannon is not comptible with ethers v6 + hardhat's network. You can use --network cannon");
  }

  //await augmentProvider(hre);
});
