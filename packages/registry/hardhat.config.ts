import * as dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';

import '@typechain/hardhat';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import 'hardhat-contract-sizer';
import '@nomiclabs/hardhat-ethers';

import 'hardhat-cannon';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: '0.8.17',
  defaultNetwork: 'cannon',
  networks: {
    hardhat: {
      chainId: 1, // required for tests
    },
    local: {
      url: 'http://127.0.0.1:8545/',
      chainId: 31337,
    },
    optimism: {
      url: process.env.PROVIDER_URL || `https://optimism-mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: process.env.CANNON_PRIVATE_KEY?.split(','),
      chainId: 10,
    },
    mainnet: {
      url: process.env.PROVIDER_URL || `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: process.env.CANNON_PRIVATE_KEY?.split(','),
      chainId: 1,
    },
    goerli: {
      url: process.env.PROVIDER_URL || `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: process.env.CANNON_PRIVATE_KEY?.split(','),
      chainId: 5,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    currency: 'USD',
    coinmarketcap: process.env.REPORT_GAS_API_KEY || '',
    gasPriceApi: process.env.ETHERSCAN_API_KEY || '',
  },
  cannon: {
    publicSourceCode: true,
  },
} as any;

export default config;
