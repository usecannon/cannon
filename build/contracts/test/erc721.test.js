var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import hre from 'hardhat';
import { equal } from 'assert/strict';
import { resolve } from 'path';
import { readFile } from 'fs/promises';
import { TASK_BUILD, TASK_CANNON } from 'hardhat-cannon/src/task-names';
import waitForServer from './helpers/server';
describe('Hardhat Runtime Environment', function () {
    let server;
    let Token;
    before('load cannon node', function () {
        return __awaiter(this, void 0, void 0, function* () {
            this.timeout(30000);
            yield hre.run(TASK_BUILD, { file: 'cannonfile.erc721.toml' });
            hre.run(TASK_CANNON, {
                label: 'erc721:0.0.1',
            });
            server = yield waitForServer();
        });
    });
    before('load module', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const content = yield readFile(resolve(hre.config.paths.deployments, hre.network.name, 'ERC721.json'));
            const deployment = JSON.parse(content.toString());
            Token = yield hre.ethers.getContractAt(deployment.abi, deployment.address);
        });
    });
    after(function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield server.close();
        });
    });
    it('can interact with default token deployment', function () {
        return __awaiter(this, void 0, void 0, function* () {
            equal(yield Token.symbol(), 'TKN');
            equal(yield Token.name(), 'Token');
        });
    });
});
