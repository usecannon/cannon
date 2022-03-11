import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-cannon';
import 'dotenv/config';

import './tasks/deploy';

import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  solidity: '0.8.11',
  networks: {
    rinkeby: {
      url: process.env.NETWORK_ENDPOINT || 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      accounts: process.env.PRIVATE_KEY ? [`${process.env.PRIVATE_KEY}`] : [],
    },
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
  cannon: {
    publisherPrivateKey: process.env.PRIVATE_KEY,
    ipfsConnection: {
      protocol: 'https',
      host: 'ipfs.infura.io',
      port: 5001,
      headers: {
        authorization: `Basic ${Buffer.from(process.env.INFURA_IPFS_ID + ':' + process.env.INFURA_IPFS_SECRET).toString(
          'base64'
        )}`,
      },
    },
  },
};

export default config;
