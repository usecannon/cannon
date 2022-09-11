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
exports.inspect = void 0;
const lodash_1 = __importDefault(require("lodash"));
const builder_1 = require("@usecannon/builder");
const chalk_1 = require("chalk");
const params_1 = require("../util/params");
const helpers_1 = require("../helpers");
function inspect(cannonDirectory, packageRef, json) {
    return __awaiter(this, void 0, void 0, function* () {
        const { name, version } = (0, params_1.parsePackageRef)(packageRef);
        if (version === 'latest') {
            // TODO fetch the current latest version from the registry?
            throw new Error(`You must specify a valid package version, given: "${version}"`);
        }
        const deployInfo = yield (0, builder_1.getAllDeploymentInfos)(cannonDirectory);
        const chainDefinition = new builder_1.ChainDefinition(deployInfo.def);
        if (json) {
            console.log(JSON.stringify(deployInfo, null, 2));
        }
        else {
            console.log((0, chalk_1.green)((0, chalk_1.bold)(`\n=============== ${name}:${version} ===============`)));
            console.log((0, chalk_1.cyan)(chainDefinition.printTopology().join('\n')));
            if (!lodash_1.default.isEmpty(deployInfo === null || deployInfo === void 0 ? void 0 : deployInfo.deploys)) {
                for (const [chainId, chainData] of Object.entries(deployInfo.deploys)) {
                    const chainName = (0, helpers_1.getChainName)(parseInt(chainId));
                    renderDeployment(chainName, chainId, chainData);
                }
            }
            else {
                console.log('This package has not been built for any chains yet.');
            }
        }
        return deployInfo;
    });
}
exports.inspect = inspect;
function renderDeployment(chainName, chainId, chainData) {
    console.log('\n' + (0, chalk_1.magenta)((0, chalk_1.bold)(chainName || '')) + ' ' + (0, chalk_1.gray)(`(Chain ID: ${chainId})`));
    console.log('\nPresets');
    for (const [presetName, presetData] of Object.entries(chainData)) {
        renderPreset(presetName, presetData);
    }
    console.log((0, chalk_1.gray)('\n--------------------------------------------------------'));
}
function renderPreset(presetName, presetData) {
    console.log(`${(0, chalk_1.bold)((0, chalk_1.cyan)(presetName))}${presetName == 'main' ? (0, chalk_1.gray)(' [DEFAULT]') : ''}`);
    if (presetData.ipfsHash.length) {
        console.log('> ✅ Published to the registry, IPFS hash: ' + presetData.ipfsHash);
    }
    else {
        console.log('> ' + (0, chalk_1.bold)((0, chalk_1.red)('⚠️  Not published to the registry')));
    }
    if (Object.keys(presetData.options).length !== 0) {
        console.log((0, chalk_1.gray)('> Options'));
        console.log(JSON.stringify(presetData.options, null, 2));
    }
}
