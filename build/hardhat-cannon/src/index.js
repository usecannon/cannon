import path from 'path';
import '@nomiclabs/hardhat-ethers';
import './tasks/build';
import './tasks/deploy';
import './tasks/export';
import './tasks/import';
import './tasks/inspect';
import './tasks/packages';
import './tasks/publish';
import './tasks/run';
import './tasks/verify';
import './subtasks/load-deploy';
import './subtasks/rpc';
import './subtasks/write-deployments';
import './type-extensions';
import { getSavedPackagesDir } from '@usecannon/builder';
import { extendConfig } from 'hardhat/config';
import { DEFAULT_CANNON_DIRECTORY, DEFAULT_REGISTRY_ADDRESS, DEFAULT_REGISTRY_ENDPOINT, DEFAULT_REGISTRY_IPFS_ENDPOINT, } from '@usecannon/cli/dist/src/constants';
extendConfig((config, userConfig) => {
    var _a, _b, _c, _d, _e, _f, _g;
    config.paths.deployments = ((_a = userConfig.paths) === null || _a === void 0 ? void 0 : _a.deployments)
        ? path.resolve(config.paths.root, userConfig.paths.deployments)
        : path.join(config.paths.root, 'deployments');
    config.paths.cannon = ((_b = userConfig.paths) === null || _b === void 0 ? void 0 : _b.cannon)
        ? path.resolve(config.paths.root, userConfig.paths.cannon)
        : getSavedPackagesDir();
    config.cannon = {
        cannonDirectory: ((_c = userConfig.cannon) === null || _c === void 0 ? void 0 : _c.cannonDirectory) || DEFAULT_CANNON_DIRECTORY,
        registryEndpoint: ((_d = userConfig.cannon) === null || _d === void 0 ? void 0 : _d.registryEndpoint) || DEFAULT_REGISTRY_ENDPOINT,
        registryAddress: ((_e = userConfig.cannon) === null || _e === void 0 ? void 0 : _e.registryAddress) || DEFAULT_REGISTRY_ADDRESS,
        ipfsEndpoint: ((_f = userConfig.cannon) === null || _f === void 0 ? void 0 : _f.ipfsEndpoint) || DEFAULT_REGISTRY_IPFS_ENDPOINT,
        ipfsAuthorizationHeader: (_g = userConfig.cannon) === null || _g === void 0 ? void 0 : _g.ipfsAuthorizationHeader,
    };
});
