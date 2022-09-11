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
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("hardhat/config");
const chalk_1 = require("chalk");
const task_names_1 = require("../task-names");
const cli_1 = require("@usecannon/cli");
const constants_1 = require("@usecannon/cli/dist/src/constants");
(0, config_1.task)(task_names_1.TASK_PUBLISH, 'Publish a Cannon package to the registry')
    .addPositionalParam('packageName', 'Name and version of the package to publish')
    .addOptionalParam('privateKey', 'Private key of the wallet to use when publishing')
    .addOptionalParam('tags', 'Comma separated list of labels for your package', 'latest')
    .addOptionalParam('registryAddress', 'Address for a custom package registry', constants_1.DEFAULT_REGISTRY_ADDRESS)
    .addOptionalParam('ipfsEndpoint', 'Address for an IPFS endpoint')
    .addOptionalParam('ipfsAuthorizationHeader', 'Authorization header for requests to the IPFS endpoint')
    .addOptionalParam('directory', 'Path to a custom package directory', constants_1.DEFAULT_CANNON_DIRECTORY)
    .setAction(({ directory, packageName, privateKey, tags, registryAddress, ipfsEndpoint, ipfsAuthorizationHeader }, hre) => __awaiter(void 0, void 0, void 0, function* () {
    if (hre.network.name == 'hardhat') {
        console.log((0, chalk_1.yellowBright)(`The ${task_names_1.TASK_PUBLISH} task must be run with ${(0, chalk_1.bold)('--network mainnet')}`));
        process.exit();
    }
    const registryEndpoint = hre.network.config.url;
    console.log(registryEndpoint);
    if (directory === constants_1.DEFAULT_CANNON_DIRECTORY && hre.config.paths.cannon) {
        directory = hre.config.paths.cannon;
    }
    if (registryAddress === constants_1.DEFAULT_REGISTRY_ADDRESS && hre.config.cannon.registryAddress) {
        registryAddress = hre.config.cannon.registryAddress;
    }
    if (hre.config.cannon.ipfsEndpoint) {
        ipfsEndpoint = hre.config.cannon.ipfsEndpoint;
    }
    if (!ipfsAuthorizationHeader && hre.config.cannon.ipfsAuthorizationHeader) {
        ipfsAuthorizationHeader = hre.config.cannon.ipfsAuthorizationHeader;
    }
    if (!privateKey) {
        privateKey = hre.config.networks[hre.network.name].accounts[0];
    }
    yield (0, cli_1.publish)(directory, privateKey, packageName, tags, registryAddress, registryEndpoint, ipfsEndpoint, ipfsAuthorizationHeader);
}));
