import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import 'dotenv/config';

import './tasks/deploy';

const config: HardhatUserConfig = {
  solidity: '0.8.11',
  networks: {
    rinkeby: {
      url: process.env.NETWORK_ENDPOINT || 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      accounts: process.env.DEPLOYER_KEY ? [`${process.env.DEPLOYER_KEY}`] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API || '',
  },
};

export default config;
