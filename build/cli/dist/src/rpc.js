"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvider = exports.runRpc = exports.ANVIL_START_TIMEOUT = void 0;
const ethers_1 = require("ethers");
const child_process_1 = require("child_process");
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('cannon:cli:rpc');
exports.ANVIL_START_TIMEOUT = 3000;
function runRpc({ port, forkUrl, chainId }) {
    const opts = ['--port', port.toString()];
    if (forkUrl) {
        opts.push('--fork-url', forkUrl);
    }
    if (Number.isSafeInteger(chainId)) {
        opts.push('--chain-id', `${chainId}`);
    }
    return Promise.race([
        new Promise((resolve) => {
            const anvilInstance = (0, child_process_1.spawn)('anvil', opts);
            process.on('exit', () => anvilInstance.kill());
            let state = 'spawning';
            anvilInstance.on('spawn', () => {
                state = 'running';
            });
            anvilInstance.on('error', (err) => {
                if (state === 'spawning') {
                    console.log(err);
                }
            });
            anvilInstance.stdout.on('data', (rawChunk) => {
                const chunk = rawChunk.toString('utf8');
                const m = chunk.match(/Listening on (.*)/);
                if (m) {
                    state = 'listening';
                    debug('cannon:cli:rpc', 'anvil spawned');
                }
                debug('cannon:cli:rpc', chunk);
            });
            anvilInstance.stderr.on('data', (rawChunk) => {
                const chunk = rawChunk.toString('utf8');
                console.error(chunk.split('\n').map((m) => 'anvil: ' + m));
            });
            resolve(anvilInstance);
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('anvil failed to start')), exports.ANVIL_START_TIMEOUT)),
    ]);
}
exports.runRpc = runRpc;
function getProvider(anvilInstance) {
    return new Promise((resolve) => {
        anvilInstance.stdout.on('data', (rawChunk) => {
            // right now check for expected output string to connect to node
            const chunk = rawChunk.toString('utf8');
            const m = chunk.match(/Listening on (.*)/);
            if (m) {
                const host = 'http://' + m[1];
                resolve(new ethers_1.ethers.providers.JsonRpcProvider(host));
            }
        });
    });
}
exports.getProvider = getProvider;
