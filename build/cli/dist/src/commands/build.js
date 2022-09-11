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
exports.build = void 0;
const lodash_1 = __importDefault(require("lodash"));
const ethers_1 = require("ethers");
const table_1 = require("table");
const chalk_1 = require("chalk");
const tildify_1 = __importDefault(require("tildify"));
const builder_1 = require("@usecannon/builder");
const helpers_1 = require("../helpers");
const rpc_1 = require("../rpc");
const printer_1 = require("../util/printer");
const registry_1 = __importDefault(require("../registry"));
function build({ cannonfilePath, settings, getArtifact, cannonDirectory, projectDirectory, preset = 'main', forkUrl, chainId = 31337, registryIpfsUrl, registryRpcUrl, registryAddress, wipe = false, }) {
    return __awaiter(this, void 0, void 0, function* () {
        const { def, name, version } = (0, helpers_1.loadCannonfile)(cannonfilePath);
        if (!version) {
            throw new Error(`Missing "version" definition on ${cannonfilePath}`);
        }
        const defSettings = def.getSettings();
        if (!settings && defSettings && !lodash_1.default.isEmpty(defSettings)) {
            const displaySettings = Object.entries(defSettings).map((setting) => [
                setting[0],
                setting[1].defaultValue || (0, chalk_1.dim)('No default value'),
                setting[1].description || (0, chalk_1.dim)('No description'),
            ]);
            console.log('This package can be built with custom settings.');
            console.log((0, chalk_1.dim)(`Example: npx hardhat cannon:build ${displaySettings[0][0]}="my ${displaySettings[0][0]}"`));
            console.log('\nSETTINGS:');
            console.log((0, table_1.table)([[(0, chalk_1.bold)('Name'), (0, chalk_1.bold)('Default Value'), (0, chalk_1.bold)('Description')], ...displaySettings]));
        }
        if (!lodash_1.default.isEmpty(settings)) {
            console.log((0, chalk_1.green)(`Creating preset ${(0, chalk_1.bold)(preset)} with the following settings: ` +
                Object.entries(settings)
                    .map((setting) => `${setting[0]}=${setting[1]}`)
                    .join(' ')));
        }
        const readMode = wipe ? 'none' : 'metadata';
        const writeMode = 'all';
        const node = yield (0, rpc_1.runRpc)({
            forkUrl,
            port: 8545,
        });
        const provider = yield (0, rpc_1.getProvider)(node);
        const builder = new builder_1.ChainBuilder({
            name,
            version,
            def,
            preset,
            readMode,
            writeMode,
            provider,
            chainId,
            baseDir: projectDirectory,
            savedPackagesDir: cannonDirectory,
            getSigner(addr) {
                return __awaiter(this, void 0, void 0, function* () {
                    // on test network any user can be conjured
                    yield provider.send('hardhat_impersonateAccount', [addr]);
                    yield provider.send('hardhat_setBalance', [addr, ethers_1.ethers.utils.parseEther('10000').toHexString()]);
                    return provider.getSigner(addr);
                });
            },
            getArtifact,
        });
        const registry = (0, registry_1.default)({
            registryAddress: registryAddress,
            registryRpc: registryRpcUrl,
            ipfsUrl: registryIpfsUrl,
        });
        const dependencies = yield builder.def.getRequiredImports(yield builder.populateSettings(settings));
        for (const dependency of dependencies) {
            console.log(`Loading dependency tree ${dependency.source} (${dependency.chainId}-${dependency.preset})`);
            yield (0, builder_1.downloadPackagesRecursive)(dependency.source, dependency.chainId, dependency.preset, registry, provider, builder.packagesDir);
        }
        builder.on(builder_1.Events.PreStepExecute, (t, n) => console.log(`\nexec: ${t}.${n}`));
        builder.on(builder_1.Events.DeployContract, (n, c) => console.log(`deployed contract ${n} (${c.address})`));
        builder.on(builder_1.Events.DeployTxn, (n, t) => console.log(`ran txn ${n} (${t.hash})`));
        const outputs = yield builder.build(settings);
        (0, printer_1.printChainBuilderOutput)(outputs);
        console.log((0, chalk_1.greenBright)(`Successfully built package ${(0, chalk_1.bold)(`${name}:${version}`)} to ${(0, chalk_1.bold)((0, tildify_1.default)(cannonDirectory))}`));
        // TODO: Update logging
        // Run this on a local node with <command>
        // Deploy it to a remote network with <command>
        // Publish your package to the registry with <command>
        node.kill();
        return { outputs, provider };
    });
}
exports.build = build;
