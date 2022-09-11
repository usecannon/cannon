var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { task } from 'hardhat/config';
import { deploy } from '@usecannon/cli';
import { TASK_DEPLOY } from '../task-names';
import { parsePackageArguments } from '@usecannon/cli/dist/src/util/params';
import { getProvider, runRpc } from '@usecannon/cli/dist/src/rpc';
import { ethers } from 'ethers';
import { CannonWrapperJsonRpcProvider } from '@usecannon/builder';
task(TASK_DEPLOY, 'Deploy a cannon package to a network')
    .addVariadicPositionalParam('packageWithSettings', 'Package to deploy, optionally with custom settings')
    .addOptionalParam('preset', 'Load an alternate setting preset', 'main')
    .addOptionalParam('prefix', 'Specify a prefix to apply to the deployment artifact outputs')
    .addFlag('dryRun', 'Simulate this deployment process without deploying the contracts to the specified network')
    .addFlag('writeDeployments', 'Wether to write deployment files when using the --dry-run flag')
    .setAction((opts, hre) => __awaiter(void 0, void 0, void 0, function* () {
    const packageDefinition = opts.packageWithSettings.reduce((result, val) => {
        return parsePackageArguments(val, result);
    }, {});
    if (!hre.network.config.chainId) {
        throw new Error('Selected network must have chainId set in hardhat configuration');
    }
    let [signer] = (yield hre.ethers.getSigners());
    let provider = hre.ethers.provider;
    if (opts.dryRun) {
        const anvilInstance = yield runRpc({
            forkUrl: hre.config.networks[hre.network.name].url,
            port: 8545,
            chainId: hre.network.config.chainId || (yield hre.ethers.provider.getNetwork()).chainId,
        });
        provider = yield getProvider(anvilInstance);
        if (Array.isArray(hre.network.config.accounts) && hre.network.config.accounts.length > 0) {
            signer = new ethers.Wallet(hre.network.config.accounts[0], provider);
        }
        else {
            const { path, mnemonic } = hre.network.config.accounts;
            signer = ethers.Wallet.fromMnemonic(`${path}/0`, mnemonic);
        }
    }
    const writeDeployments = !opts.dryRun || (opts.dryRun && opts.writeDeployments);
    const { outputs } = yield deploy({
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
        provider = new CannonWrapperJsonRpcProvider(outputs, provider.connection);
    }
    return { outputs, provider, signer };
}));
