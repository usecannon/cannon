import 'hardhat-cannon';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@typechain/hardhat';
import 'solidity-coverage';
import 'dotenv/config';
const config = {
    solidity: '0.8.11',
    networks: {
        local: {
            chainId: 31337,
            url: 'http://localhost:8545',
        },
        mainnet: {
            chainId: 1,
            url: process.env.NETWORK_ENDPOINT || '',
            accounts: process.env.PRIVATE_KEY ? [`${process.env.PRIVATE_KEY}`] : [],
        },
        rinkeby: {
            chainId: 4,
            url: process.env.NETWORK_ENDPOINT || '',
            accounts: process.env.PRIVATE_KEY ? [`${process.env.PRIVATE_KEY}`] : [],
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY || '',
    },
    cannon: {
        ipfsConnection: {
            protocol: 'https',
            host: 'ipfs.infura.io',
            port: 5001,
            headers: {
                authorization: `Basic ${Buffer.from(process.env.INFURA_IPFS_ID + ':' + process.env.INFURA_IPFS_SECRET).toString('base64')}`,
            },
        },
    },
};
export default config;
