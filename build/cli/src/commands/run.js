var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { greenBright, green, magentaBright, bold, gray } from 'chalk';
import { ethers } from 'ethers';
import { mapKeys, mapValues } from 'lodash';
import { ChainBuilder, downloadPackagesRecursive } from '@usecannon/builder';
import { setupAnvil } from '../helpers';
import { getProvider, runRpc } from '../rpc';
import createRegistry from '../registry';
import { interact } from '../interact';
import { printChainBuilderOutput } from '../util/printer';
import { writeModuleDeployments } from '../util/write-deployments';
import fs from 'fs-extra';
import { resolve } from 'path';
import onKeypress from '../util/on-keypress';
const INITIAL_INSTRUCTIONS = green(`Press ${bold('h')} to see help information for this command.`);
const INSTRUCTIONS = green(`Press ${bold('a')} to toggle displaying the logs from your local node.\nPress ${bold('i')} to interact with contracts via the command line.`);
export function run(packages, options) {
    return __awaiter(this, void 0, void 0, function* () {
        /*
        if (packages.length && options.file) {
          throw new Error('You cannot run a cannon node both defining a file and giving it packages');
        }
      
        if (!packages.length || options.file) {
          // TODO: implement cannon.json file parsing. And allow to spin up several anvil nodes on different ports
          throw new Error('cannon.json file parsing not implemented yet');
        }
        */
        yield setupAnvil();
        console.log(magentaBright('Starting local node...'));
        // Start the rpc server
        const node = yield createNode({
            port: Number(options.port) || 8545,
            forkUrl: options.fork,
        });
        const getSigner = (addr) => __awaiter(this, void 0, void 0, function* () {
            // on test network any user can be conjured
            if (options.impersonate) {
                yield node.provider.send('hardhat_impersonateAccount', [addr]);
            }
            return node.provider.getSigner(addr);
        });
        if (options.fundAddresses && options.fundAddresses.length) {
            for (const fundAddress of options.fundAddresses) {
                yield node.provider.send('hardhat_setBalance', [fundAddress, ethers.utils.parseEther('10000').toHexString()]);
            }
        }
        const networkInfo = yield node.provider.getNetwork();
        const registry = createRegistry({
            registryAddress: options.registryAddress,
            registryRpc: options.registryRpcUrl,
            ipfsUrl: options.registryIpfsUrl,
        });
        for (const pkg of packages) {
            const name = `${pkg.name}:${pkg.version}`;
            console.log(magentaBright(`Downloading ${name}...`));
            yield downloadPackagesRecursive(name, networkInfo.chainId, options.preset, registry, node.provider, options.cannonDirectory);
        }
        const buildOutputs = [];
        for (const pkg of packages) {
            const { name, version, settings } = pkg;
            console.log(magentaBright(`Building ${name}:${version}...`));
            const builder = new ChainBuilder({
                name,
                version,
                readMode: options.fork ? 'metadata' : 'all',
                writeMode: 'none',
                preset: options.preset,
                savedPackagesDir: options.cannonDirectory,
                chainId: networkInfo.chainId,
                provider: node.provider,
                getSigner,
            });
            const outputs = yield builder.build(settings);
            console.log(greenBright(`${bold(`${name}:${version}`)} has been deployed to a local node running at ${bold(node.provider.connection.url)}`));
            buildOutputs.push(outputs);
            if (options.writeDeployments) {
                console.log(magentaBright(`Writing deployment data to ${options.writeDeployments}...`));
                const path = resolve(options.writeDeployments);
                yield fs.mkdirp(path);
                yield writeModuleDeployments(options.writeDeployments, '', outputs);
            }
            printChainBuilderOutput(outputs);
        }
        const signers = createSigners(node.provider);
        if (options.logs) {
            return {
                signers,
                outputs: buildOutputs,
                provider: node.provider,
                node: node.instance,
            };
        }
        console.log();
        console.log(INITIAL_INSTRUCTIONS);
        console.log(INSTRUCTIONS);
        yield onKeypress((evt, { pause, stop }) => __awaiter(this, void 0, void 0, function* () {
            if (evt.ctrl && evt.name === 'c') {
                stop();
                process.exit();
            }
            else if (evt.name === 'a') {
                // Toggle showAnvilLogs when the user presses "a"
                if (node.logging()) {
                    console.log(gray('Paused anvil logs...'));
                    console.log(INSTRUCTIONS);
                    node.disableLogging();
                }
                else {
                    console.log(gray('Unpaused anvil logs...'));
                    node.enableLogging();
                }
            }
            else if (evt.name === 'i') {
                if (node.logging())
                    return;
                if (buildOutputs.length > 1) {
                    // TODO add interact on multiple packages compatibility
                    throw new Error('Interact command not implemented when running multiple packages');
                }
                yield pause(() => interact({
                    provider: node.provider,
                    signer: signers[0],
                    contracts: getContractsRecursive(buildOutputs[0], signers[0]),
                }));
                console.log(INITIAL_INSTRUCTIONS);
                console.log(INSTRUCTIONS);
            }
            else if (evt.name === 'h') {
                if (node.logging())
                    return;
                if (options.helpInformation)
                    console.log('\n' + options.helpInformation);
                console.log();
                console.log(INSTRUCTIONS);
            }
        }));
    });
}
function createSigners(provider) {
    const signers = [];
    for (let i = 0; i < 10; i++) {
        signers.push(ethers.Wallet.fromMnemonic('test test test test test test test test test test test junk', `m/44'/60'/0'/0/${i}`).connect(provider));
    }
    return signers;
}
function getContractsRecursive(outputs, signer, prefix) {
    let contracts = mapValues(outputs.contracts, (ci) => new ethers.Contract(ci.address, ci.abi, signer));
    if (prefix) {
        contracts = mapKeys(contracts, (_, contractName) => `${prefix}.${contractName}`);
    }
    for (const [importName, importOutputs] of Object.entries(outputs.imports)) {
        const newContracts = getContractsRecursive(importOutputs, signer, importName);
        contracts = Object.assign(Object.assign({}, contracts), newContracts);
    }
    return contracts;
}
function createNode({ port = 8545, forkUrl = '' }) {
    return __awaiter(this, void 0, void 0, function* () {
        const instance = yield runRpc({
            port,
            forkUrl,
        });
        let logging = false;
        let outputBuffer = '';
        instance.stdout.on('data', (rawChunk) => {
            const chunk = rawChunk.toString('utf8');
            const newData = chunk
                .split('\n')
                .map((m) => {
                return gray('anvil: ') + m;
            })
                .join('\n');
            if (logging) {
                console.log(newData);
            }
            else {
                outputBuffer += '\n' + newData;
            }
        });
        const provider = yield getProvider(instance);
        const node = {
            instance,
            provider,
            logging: () => logging,
            enableLogging: () => {
                if (outputBuffer) {
                    console.log(outputBuffer);
                    outputBuffer = '';
                }
                logging = true;
            },
            disableLogging: () => {
                logging = false;
            },
        };
        return node;
    });
}
