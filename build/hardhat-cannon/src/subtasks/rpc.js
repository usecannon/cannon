var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { spawn } from 'child_process';
import { ethers } from 'ethers';
import { subtask } from 'hardhat/config';
import Debug from 'debug';
const debug = Debug('cannon:hardhat:rpc');
import { SUBTASK_RPC } from '../task-names';
const ANVIL_OP_TIMEOUT = 10000;
// saved up here to allow for reset of existing process
let anvilInstance = null;
subtask(SUBTASK_RPC).setAction((settings, hre) => {
    const { port, forkUrl, chainId } = settings;
    if (anvilInstance && anvilInstance.exitCode === null) {
        console.log('shutting down existing anvil subprocess', anvilInstance.pid);
        return Promise.race([
            new Promise((resolve) => {
                anvilInstance.once('close', () => __awaiter(void 0, void 0, void 0, function* () {
                    anvilInstance = null;
                    resolve(yield hre.run(SUBTASK_RPC, settings));
                }));
                anvilInstance.kill();
            }),
            timeout(ANVIL_OP_TIMEOUT, 'could not shut down previous anvil'),
        ]);
    }
    const opts = ['--port', port];
    if (chainId) {
        opts.push('--chain-id', chainId);
    }
    // reduce image size by not creating unnecessary accounts
    opts.push('--accounts', '1');
    if (forkUrl) {
        opts.push('--fork-url', forkUrl);
    }
    return Promise.race([
        new Promise((resolve, reject) => {
            var _a, _b;
            anvilInstance = spawn('anvil', opts);
            process.once('exit', () => anvilInstance === null || anvilInstance === void 0 ? void 0 : anvilInstance.kill());
            let state = 'spawning';
            anvilInstance.on('spawn', () => {
                state = 'running';
            });
            anvilInstance.on('error', (err) => {
                if (state == 'spawning') {
                    reject(new Error(`Anvil failed to start: ${err}

Though it is not necessary for your hardhat project, Foundry is required to use Cannon. 

Ensure you have foundry and anvil installed by running the following commands:

curl -L https://foundry.paradigm.xyz | bash
foundryup

For more info, see https://book.getfoundry.sh/getting-started/installation.html
          `));
                }
            });
            (_a = anvilInstance.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (rawChunk) => {
                // right now check for expected output string to connect to node
                const chunk = rawChunk.toString('utf8');
                const m = chunk.match(/Listening on (.*)/);
                if (m) {
                    const host = 'http://' + m[1];
                    state = 'listening';
                    //console.log('anvil spawned at', host);
                    resolve(new ethers.providers.JsonRpcProvider(host));
                }
                debug(chunk);
            });
            (_b = anvilInstance.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (rawChunk) => {
                const chunk = rawChunk.toString('utf8');
                console.error(chunk.split('\n').map((m) => 'anvil: ' + m));
            });
        }),
        timeout(ANVIL_OP_TIMEOUT, 'anvil failed to start'),
    ]);
});
function timeout(period, msg) {
    return new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), period));
}
