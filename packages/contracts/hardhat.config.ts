import 'dotenv/config';
import { HardhatUserConfig } from 'hardhat/config';
import 'hardhat-cannon';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 800,
      },
      metadata: {
        // do not include the metadata hash, since this is machine dependent
        // and we want all generated code to be deterministic
        // https://docs.soliditylang.org/en/v0.7.6/metadata.html
        bytecodeHash: 'none',
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    local: {
      url: 'http://127.0.0.1:8545/',
      chainId: 31337,
    },
    mainnet: {
      url: process.env.PROVIDER_URL || `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      chainId: 1,
      accounts: process.env.PRIVATE_KEY?.split(','),
    },
    ropsten: {
      url: process.env.PROVIDER_URL || `https://ropsten.infura.io/v3/${process.env.INFURA_KEY}`,
      chainId: 3,
      accounts: process.env.PRIVATE_KEY?.split(','),
    },
    rinkeby: {
      url: process.env.PROVIDER_URL || `https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`,
      chainId: 4,
      accounts: process.env.PRIVATE_KEY?.split(','),
    },
    goerli: {
      url: process.env.PROVIDER_URL || `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: process.env.PRIVATE_KEY?.split(','),
      chainId: 5,
    },
  },
  cannon: {
    ipfsEndpoint: 'https://ipfs.infura.io:5001',
    ipfsAuthorizationHeader: `Basic ${Buffer.from(
      process.env.INFURA_IPFS_ID + ':' + process.env.INFURA_IPFS_SECRET
    ).toString('base64')}`,
  },
};

export default config;
