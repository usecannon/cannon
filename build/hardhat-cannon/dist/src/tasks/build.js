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
const path_1 = __importDefault(require("path"));
const config_1 = require("hardhat/config");
const plugins_1 = require("hardhat/plugins");
const task_names_1 = require("hardhat/builtin-tasks/task-names");
const cli_1 = require("@usecannon/cli");
const params_1 = require("@usecannon/cli/dist/src/util/params");
const task_names_2 = require("../task-names");
const builder_1 = require("@usecannon/builder");
(0, config_1.task)(task_names_2.TASK_BUILD, 'Assemble a defined chain and save it to to a state which can be used later')
    .addPositionalParam('cannonfile', 'Path to a cannonfile to build', 'cannonfile.toml')
    .addOptionalVariadicPositionalParam('settings', 'Custom settings for building the cannonfile', [])
    .addOptionalParam('preset', 'The preset label for storing the build with the given settings', 'main')
    .addFlag('noCompile', 'Do not execute hardhat compile before build')
    .setAction(({ cannonfile, settings, preset, noCompile }, hre) => __awaiter(void 0, void 0, void 0, function* () {
    if (!noCompile) {
        yield hre.run(task_names_1.TASK_COMPILE);
        console.log('');
    }
    // If the first param is not a cannonfile, it should be parsed as settings
    if (typeof cannonfile === 'string' && !cannonfile.endsWith('.toml')) {
        settings.unshift(cannonfile);
        cannonfile = 'cannonfile.toml';
    }
    const cannonfilePath = path_1.default.resolve(hre.config.paths.root, cannonfile);
    const parsedSettings = (0, params_1.parseSettings)(settings);
    const forkUrl = hre.network.name === plugins_1.HARDHAT_NETWORK_NAME
        ? undefined
        : hre.config.networks[hre.network.name].url;
    const signers = yield hre.ethers.getSigners();
    const params = {
        cannonfilePath,
        settings: parsedSettings,
        getArtifact: (contractName) => hre.artifacts.readArtifact(contractName),
        cannonDirectory: hre.config.paths.cannon,
        projectDirectory: hre.config.paths.root,
        forkUrl,
        chainId: hre.network.config.chainId || (yield hre.ethers.provider.getNetwork()).chainId,
        preset,
        registryIpfsUrl: hre.config.cannon.ipfsEndpoint,
        registryRpcUrl: hre.config.cannon.registryEndpoint,
        registryAddress: hre.config.cannon.registryAddress,
    };
    let { outputs, provider } = yield (0, cli_1.build)(params);
    // set provider to cannon wrapper to allow error parsing
    if (provider.connection) {
        provider = new builder_1.CannonWrapperJsonRpcProvider(outputs, provider.connection);
    }
    return { outputs, provider, signers };
}));
