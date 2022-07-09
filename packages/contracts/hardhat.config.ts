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
  cannon: {
    publisherPrivateKey: process.env.PRIVATE_KEY,
    ipfsConnection: {
      protocol: 'https',
      host: 'ipfs.infura.io',
      port: 5001,
      headers: {
        authorization: `Basic ${Buffer.from(
          process.env.INFURA_IPFS_ID + ':' + process.env.INFURA_IPFS_SECRET
        ).toString('base64')}`,
      },
    },
  },
};

export default config;
