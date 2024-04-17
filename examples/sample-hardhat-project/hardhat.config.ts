import '@nomiclabs/hardhat-etherscan';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import '@nomiclabs/hardhat-ethers';

import '../../packages/hardhat-cannon/src/index';

import * as dotenv from 'dotenv';
import { task } from 'hardhat/config';

import './tasks/get-build-info';

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// need to use `any` type here instead of HardhatUserConfig because something borky is going on with typescript resolution of cannon config overrides
const config: any = {
  solidity: '0.8.4',
  defaultNetwork: 'cannon',
  networks: {
    hardhat: {
      chainId: 31337,
    },
    local: {
      url: 'http://127.0.0.1:8545/',
      accounts: process.env.PRIVATE_KEY?.split(','),
      chainId: 1337,
    },
    mainnet: {
      url: process.env.PROVIDER_URL || `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: process.env.PRIVATE_KEY?.split(','),
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
  cannon: {
    // if your smart contracts are open source, set this to true to enable contract verification and pushing of your contact sources
    publicSourceCode: true,
  },
};

export default config;
