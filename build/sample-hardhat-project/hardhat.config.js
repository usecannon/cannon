var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a, _b, _c;
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-interact';
import '../hardhat-cannon/src/index';
import 'hardhat-interact';
import * as dotenv from 'dotenv';
import { task } from 'hardhat/config';
dotenv.config();
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', (taskArgs, hre) => __awaiter(void 0, void 0, void 0, function* () {
    const accounts = yield hre.ethers.getSigners();
    for (const account of accounts) {
        console.log(account.address);
    }
}));
const config = {
    solidity: '0.8.4',
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
        ropsten: {
            url: process.env.PROVIDER_URL || `https://ropsten.infura.io/v3/${process.env.INFURA_KEY}`,
            chainId: 3,
            accounts: (_a = process.env.PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.split(','),
        },
        rinkeby: {
            url: process.env.PROVIDER_URL || `https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`,
            chainId: 4,
            accounts: (_b = process.env.PRIVATE_KEY) === null || _b === void 0 ? void 0 : _b.split(','),
        },
        goerli: {
            url: process.env.PROVIDER_URL || `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
            accounts: (_c = process.env.PRIVATE_KEY) === null || _c === void 0 ? void 0 : _c.split(','),
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
        ipfsEndpoint: 'https://ipfs.infura.io:5001',
        ipfsAuthorizationHeader: `Basic ${Buffer.from(process.env.INFURA_IPFS_ID + ':' + process.env.INFURA_IPFS_SECRET).toString('base64')}`,
    },
};
export default config;
