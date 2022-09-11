"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const toml_1 = __importDefault(require("@iarna/toml"));
const plugins_1 = require("hardhat/plugins");
const ethers_1 = require("ethers");
const builder_1 = require("@usecannon/builder");
const definition_1 = require("@usecannon/builder/dist/src/definition");
function loadCannonfile(hre, filepath) {
    if (!fs_extra_1.default.existsSync(filepath)) {
        throw new plugins_1.HardhatPluginError('cannon', `Cannon file '${filepath}' not found.`);
    }
    const rawDef = toml_1.default.parse(fs_extra_1.default.readFileSync(filepath).toString('utf8'));
    let pkg = {};
    try {
        pkg = require(path_1.default.join(hre.config.paths.root, 'package.json'));
    }
    catch (err) {
        console.warn('package.json file not found! Cannot use field for cannonfile inference');
    }
    if (!rawDef.name || typeof rawDef.name !== 'string') {
        rawDef.name = pkg.name;
    }
    try {
        ethers_1.ethers.utils.formatBytes32String(rawDef.name);
    }
    catch (err) {
        let msg = 'Invalid "name" property on cannonfile.toml. ';
        if (err instanceof Error)
            msg += err.message;
        throw new Error(msg);
    }
    if (!rawDef.version || typeof rawDef.version !== 'string') {
        rawDef.version = pkg.version;
    }
    try {
        ethers_1.ethers.utils.formatBytes32String(rawDef.version);
    }
    catch (err) {
        let msg = 'Invalid "version" property on cannonfile.toml. ';
        if (err instanceof Error)
            msg += err.message;
        throw new Error(msg);
    }
    if (!(0, builder_1.validateChainDefinition)(rawDef)) {
        console.error('cannonfile failed parse:');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const error of builder_1.validateChainDefinition.errors || []) {
            console.log(`> at .${error.schemaPath}: ${error.message} (${JSON.stringify(error.params)})`);
        }
        throw new Error('failed to parse cannonfile');
    }
    const def = new definition_1.ChainDefinition(rawDef);
    const ctx = {
        package: fs_extra_1.default.readJsonSync(hre.config.paths.root + '/package.json'),
        chainId: hre.network.config.chainId || 31337,
        settings: {},
        timestamp: '0',
        contracts: {},
        txns: {},
        imports: {},
    };
    const name = def.getName(ctx);
    const version = def.getVersion(ctx);
    return { def, name, version };
}
exports.default = loadCannonfile;
