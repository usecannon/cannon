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
const rpc_1 = require("@usecannon/cli/dist/src/rpc");
const ethers_1 = require("ethers");
const builder_1 = require("@usecannon/builder");
(0, config_1.task)(task_names_1.TASK_DEPLOY, 'Deploy a cannon package to a network')
    .addVariadicPositionalParam('packageWithSettings', 'Package to deploy, optionally with custom settings')
    .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
    .addOptionalParam('prefix', 'Specify a prefix to apply to the deployment artifact outputs')
    .addFlag('dryRun', 'Simulate this deployment process without deploying the contracts to the specified network')
    .addFlag('writeDeployments', 'Wether to write deployment files when using the --dry-run flag')
    .setAction((opts, hre) => __awaiter(void 0, void 0, void 0, function* () {
    const packageDefinition = opts.packageWithSettings.reduce((result, val) => {
        return (0, params_1.parsePackageArguments)(val, result);
    }, {});
    if (!hre.network.config.chainId) {
        throw new Error('Selected network must have chainId set in hardhat configuration');
    }
    let [signer] = (yield hre.ethers.getSigners());
    let provider = hre.ethers.provider;
    if (opts.dryRun) {
        const anvilInstance = yield (0, rpc_1.runRpc)({
            forkUrl: hre.config.networks[hre.network.name].url,
            port: 8545,
            chainId: hre.network.config.chainId || (yield hre.ethers.provider.getNetwork()).chainId,
        });
        provider = yield (0, rpc_1.getProvider)(anvilInstance);
        if (Array.isArray(hre.network.config.accounts) && hre.network.config.accounts.length > 0) {
            signer = new ethers_1.ethers.Wallet(hre.network.config.accounts[0], provider);
        }
        else {
            const { path, mnemonic } = hre.network.config.accounts;
            signer = ethers_1.ethers.Wallet.fromMnemonic(`${path}/0`, mnemonic);
        }
    }
    const writeDeployments = !opts.dryRun || (opts.dryRun && opts.writeDeployments);
    const { outputs } = yield (0, cli_1.deploy)({
        packageDefinition,
        provider,
        signer,
        preset: opts.preset,
        dryRun: opts.dryRun,
        prefix: opts.prefix,
        cannonDirectory: hre.config.paths.cannon,
        registryIpfsUrl: hre.config.cannon.ipfsEndpoint,
        registryRpcUrl: hre.config.cannon.registryEndpoint,
        registryAddress: hre.config.cannon.registryAddress,
        projectDirectory: hre.config.paths.root,
        deploymentPath: writeDeployments ? hre.config.paths.deployments : '',
    });
    // set provider to cannon wrapper to allow error parsing
    if (provider.connection) {
        provider = new builder_1.CannonWrapperJsonRpcProvider(outputs, provider.connection);
    }
    return { outputs, provider, signer };
}));
