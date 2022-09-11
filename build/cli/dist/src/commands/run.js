"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const chalk_1 = require("chalk");
const ethers_1 = require("ethers");
const lodash_1 = require("lodash");
const builder_1 = require("@usecannon/builder");
const helpers_1 = require("../helpers");
const rpc_1 = require("../rpc");
const registry_1 = __importDefault(require("../registry"));
const interact_1 = require("../interact");
const printer_1 = require("../util/printer");
const write_deployments_1 = require("../util/write-deployments");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = require("path");
const on_keypress_1 = __importDefault(require("../util/on-keypress"));
const INITIAL_INSTRUCTIONS = (0, chalk_1.green)(`Press ${(0, chalk_1.bold)('h')} to see help information for this command.`);
const INSTRUCTIONS = (0, chalk_1.green)(`Press ${(0, chalk_1.bold)('a')} to toggle displaying the logs from your local node.\nPress ${(0, chalk_1.bold)('i')} to interact with contracts via the command line.`);
function run(packages, options) {
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
        yield (0, helpers_1.setupAnvil)();
        console.log((0, chalk_1.magentaBright)('Starting local node...'));
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
                yield node.provider.send('hardhat_setBalance', [fundAddress, ethers_1.ethers.utils.parseEther('10000').toHexString()]);
            }
        }
        const networkInfo = yield node.provider.getNetwork();
        const registry = (0, registry_1.default)({
            registryAddress: options.registryAddress,
            registryRpc: options.registryRpcUrl,
            ipfsUrl: options.registryIpfsUrl,
        });
        for (const pkg of packages) {
            const name = `${pkg.name}:${pkg.version}`;
            console.log((0, chalk_1.magentaBright)(`Downloading ${name}...`));
            yield (0, builder_1.downloadPackagesRecursive)(name, networkInfo.chainId, options.preset, registry, node.provider, options.cannonDirectory);
        }
        const buildOutputs = [];
        for (const pkg of packages) {
            const { name, version, settings } = pkg;
            console.log((0, chalk_1.magentaBright)(`Building ${name}:${version}...`));
            const builder = new builder_1.ChainBuilder({
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
            console.log((0, chalk_1.greenBright)(`${(0, chalk_1.bold)(`${name}:${version}`)} has been deployed to a local node running at ${(0, chalk_1.bold)(node.provider.connection.url)}`));
            buildOutputs.push(outputs);
            if (options.writeDeployments) {
                console.log((0, chalk_1.magentaBright)(`Writing deployment data to ${options.writeDeployments}...`));
                const path = (0, path_1.resolve)(options.writeDeployments);
                yield fs_extra_1.default.mkdirp(path);
                yield (0, write_deployments_1.writeModuleDeployments)(options.writeDeployments, '', outputs);
            }
            (0, printer_1.printChainBuilderOutput)(outputs);
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
        yield (0, on_keypress_1.default)((evt, { pause, stop }) => __awaiter(this, void 0, void 0, function* () {
            if (evt.ctrl && evt.name === 'c') {
                stop();
                process.exit();
            }
            else if (evt.name === 'a') {
                // Toggle showAnvilLogs when the user presses "a"
                if (node.logging()) {
                    console.log((0, chalk_1.gray)('Paused anvil logs...'));
                    console.log(INSTRUCTIONS);
                    node.disableLogging();
                }
                else {
                    console.log((0, chalk_1.gray)('Unpaused anvil logs...'));
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
                yield pause(() => (0, interact_1.interact)({
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
exports.run = run;
function createSigners(provider) {
    const signers = [];
    for (let i = 0; i < 10; i++) {
        signers.push(ethers_1.ethers.Wallet.fromMnemonic('test test test test test test test test test test test junk', `m/44'/60'/0'/0/${i}`).connect(provider));
    }
    return signers;
}
function getContractsRecursive(outputs, signer, prefix) {
    let contracts = (0, lodash_1.mapValues)(outputs.contracts, (ci) => new ethers_1.ethers.Contract(ci.address, ci.abi, signer));
    if (prefix) {
        contracts = (0, lodash_1.mapKeys)(contracts, (_, contractName) => `${prefix}.${contractName}`);
    }
    for (const [importName, importOutputs] of Object.entries(outputs.imports)) {
        const newContracts = getContractsRecursive(importOutputs, signer, importName);
        contracts = Object.assign(Object.assign({}, contracts), newContracts);
    }
    return contracts;
}
function createNode({ port = 8545, forkUrl = '' }) {
    return __awaiter(this, void 0, void 0, function* () {
        const instance = yield (0, rpc_1.runRpc)({
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
                return (0, chalk_1.gray)('anvil: ') + m;
            })
                .join('\n');
            if (logging) {
                console.log(newData);
            }
            else {
                outputBuffer += '\n' + newData;
            }
        });
        const provider = yield (0, rpc_1.getProvider)(instance);
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
