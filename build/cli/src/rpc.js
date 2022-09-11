import { ethers } from 'ethers';
import { spawn } from 'child_process';
import Debug from 'debug';
const debug = Debug('cannon:cli:rpc');
export const ANVIL_START_TIMEOUT = 3000;
export function runRpc({ port, forkUrl, chainId }) {
    const opts = ['--port', port.toString()];
    if (forkUrl) {
        opts.push('--fork-url', forkUrl);
    }
    if (Number.isSafeInteger(chainId)) {
        opts.push('--chain-id', `${chainId}`);
    }
    return Promise.race([
        new Promise((resolve) => {
            const anvilInstance = spawn('anvil', opts);
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
        new Promise((_, reject) => setTimeout(() => reject(new Error('anvil failed to start')), ANVIL_START_TIMEOUT)),
    ]);
}
export function getProvider(anvilInstance) {
    return new Promise((resolve) => {
        anvilInstance.stdout.on('data', (rawChunk) => {
            // right now check for expected output string to connect to node
            const chunk = rawChunk.toString('utf8');
            const m = chunk.match(/Listening on (.*)/);
            if (m) {
                const host = 'http://' + m[1];
                resolve(new ethers.providers.JsonRpcProvider(host));
            }
        });
    });
}
