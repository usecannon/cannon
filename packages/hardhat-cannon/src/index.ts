import { CANNON_CHAIN_ID } from '@usecannon/builder';
import { extendConfig, extendEnvironment } from 'hardhat/config';
import { HardhatConfig, HardhatRuntimeEnvironment, HardhatUserConfig } from 'hardhat/types';
import './tasks/alter';
import './tasks/build';
import './tasks/inspect';
import './tasks/test';
import './subtasks/get-artifact-data';
import './subtasks/load-package-definition';
import './subtasks/run-anvil-node';
import './type-extensions';

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  config.cannon = {};

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
  const { getContract, getContractData, getAllContractDatas } = await import('./utils');
  hre.cannon = { getContract, getContractData, getAllContractDatas };
});
