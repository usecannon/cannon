"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
require("@nomiclabs/hardhat-ethers");
require("./tasks/build");
require("./tasks/deploy");
require("./tasks/export");
require("./tasks/import");
require("./tasks/inspect");
require("./tasks/packages");
require("./tasks/publish");
require("./tasks/run");
require("./tasks/verify");
require("./subtasks/load-deploy");
require("./subtasks/rpc");
require("./subtasks/write-deployments");
require("./type-extensions");
const builder_1 = require("@usecannon/builder");
const config_1 = require("hardhat/config");
const constants_1 = require("@usecannon/cli/dist/src/constants");
(0, config_1.extendConfig)((config, userConfig) => {
    var _a, _b, _c, _d, _e, _f, _g;
    config.paths.deployments = ((_a = userConfig.paths) === null || _a === void 0 ? void 0 : _a.deployments)
        ? path_1.default.resolve(config.paths.root, userConfig.paths.deployments)
        : path_1.default.join(config.paths.root, 'deployments');
    config.paths.cannon = ((_b = userConfig.paths) === null || _b === void 0 ? void 0 : _b.cannon)
        ? path_1.default.resolve(config.paths.root, userConfig.paths.cannon)
        : (0, builder_1.getSavedPackagesDir)();
    config.cannon = {
        cannonDirectory: ((_c = userConfig.cannon) === null || _c === void 0 ? void 0 : _c.cannonDirectory) || constants_1.DEFAULT_CANNON_DIRECTORY,
        registryEndpoint: ((_d = userConfig.cannon) === null || _d === void 0 ? void 0 : _d.registryEndpoint) || constants_1.DEFAULT_REGISTRY_ENDPOINT,
        registryAddress: ((_e = userConfig.cannon) === null || _e === void 0 ? void 0 : _e.registryAddress) || constants_1.DEFAULT_REGISTRY_ADDRESS,
        ipfsEndpoint: ((_f = userConfig.cannon) === null || _f === void 0 ? void 0 : _f.ipfsEndpoint) || constants_1.DEFAULT_REGISTRY_IPFS_ENDPOINT,
        ipfsAuthorizationHeader: (_g = userConfig.cannon) === null || _g === void 0 ? void 0 : _g.ipfsAuthorizationHeader,
    };
});
