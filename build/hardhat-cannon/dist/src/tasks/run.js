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
const cli_1 = require("@usecannon/cli");
const task_names_1 = require("../task-names");
const params_1 = require("@usecannon/cli/dist/src/util/params");
(0, config_1.task)(task_names_1.TASK_RUN, 'Utility for instantly loading cannon packages in standalone contexts')
    .addVariadicPositionalParam('packageNames', 'List of packages to load, optionally with custom settings for each one')
    .addOptionalParam('port', 'Port which the JSON-RPC server will be exposed', '8545')
    .addOptionalParam('fork', 'Fork the network at the specified RPC url')
    .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
    .addOptionalParam('fundAddresses', 'Comma separated list of addresses to receive a balance of 10,000 ETH', '')
    .addFlag('writeDeployments', 'Wether or not to write deployments data to the path.deployments folder')
    .addFlag('impersonate', 'Create impersonated signers instead of using real wallets')
    .addFlag('logs', 'Show RPC logs instead of an interactive prompt')
    .setAction(({ packageNames, port, fork, logs, preset, writeDeployments, impersonate, fundAddresses }, hre) => __awaiter(void 0, void 0, void 0, function* () {
    const packages = packageNames.reduce((result, val) => {
        return (0, params_1.parsePackagesArguments)(val, result);
    }, []);
    return (0, cli_1.run)(packages, {
        port,
        fork,
        logs,
        preset,
        writeDeployments: writeDeployments ? hre.config.paths.deployments : '',
        cannonDirectory: hre.config.paths.cannon,
        registryIpfsUrl: hre.config.cannon.ipfsEndpoint,
        registryRpcUrl: hre.config.cannon.registryEndpoint,
        registryAddress: hre.config.cannon.registryAddress,
        impersonate,
        fundAddresses: fundAddresses
            .split(',')
            .filter(Boolean)
            .map((s) => s.trim())
            .filter(Boolean),
    });
}));
