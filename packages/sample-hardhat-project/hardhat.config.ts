import '@nomiclabs/hardhat-etherscan';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import '@nomiclabs/hardhat-ethers';

import 'hardhat-interact';

import '../hardhat-cannon/src/index';

import 'hardhat-interact';

import * as dotenv from 'dotenv';
import { HardhatUserConfig, task } from 'hardhat/config';

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: '0.8.4',
  defaultNetwork: 'cannon',
  networks: {
    hardhat: {
      chainId: 31337,
    },
    local: {
      url: 'http://127.0.0.1:8545/',
      chainId: 31337,
    },
    mainnet: {
      url: process.env.PROVIDER_URL || `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      chainId: 1,
    },
    goerli: {
      url: process.env.PROVIDER_URL || `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: process.env.PRIVATE_KEY?.split(','),
      chainId: 5,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
