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
exports.getChainId = exports.getChainName = exports.findPackage = exports.loadCannonfile = exports.checkCannonVersion = exports.execPromise = exports.setupAnvil = void 0;
const node_os_1 = __importDefault(require("node:os"));
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const prompts_1 = __importDefault(require("prompts"));
const chalk_1 = require("chalk");
const toml_1 = __importDefault(require("@iarna/toml"));
const builder_1 = require("@usecannon/builder");
const types_1 = require("./types");
function setupAnvil() {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO Setup anvil using https://github.com/foundry-rs/hardhat/tree/develop/packages/easy-foundryup
        //      It also works when the necessary foundry binary is not on PATH
        const versionDate = yield getAnvilVersionDate();
        if (versionDate) {
            // Confirm we have a version after the anvil_loadState/anvil_dumpState functionality was added.
            if (versionDate.getTime() < 1657679573421) {
                const anvilResponse = yield (0, prompts_1.default)({
                    type: 'confirm',
                    name: 'confirmation',
                    message: 'Cannon requires a newer version of Foundry. Install it now?',
                    initial: true,
                });
                if (anvilResponse.confirmation) {
                    console.log((0, chalk_1.magentaBright)('Upgrading Foundry to the latest version...'));
                    yield execPromise('foundryup');
                }
                else {
                    process.exit();
                }
            }
        }
        else {
            const response = yield (0, prompts_1.default)({
                type: 'confirm',
                name: 'confirmation',
                message: 'Cannon requires Foundry. Install it now?',
                initial: true,
            });
            if (response.confirmation) {
                console.log((0, chalk_1.magentaBright)('Installing Foundry...'));
                yield execPromise('curl -L https://foundry.paradigm.xyz | bash');
                yield execPromise(node_os_1.default.homedir() + '/.foundry/bin/foundryup');
            }
            else {
                process.exit();
            }
        }
    });
}
exports.setupAnvil = setupAnvil;
function getAnvilVersionDate() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const child = yield (0, node_child_process_1.spawnSync)('anvil', ['--version']);
            const output = child.stdout.toString();
            const timestamp = output.substring(output.indexOf('(') + 1, output.lastIndexOf(')')).split(' ')[1];
            return new Date(timestamp);
        }
        catch (_a) {
            return false;
        }
    });
}
function execPromise(command) {
    return new Promise(function (resolve, reject) {
        (0, node_child_process_1.exec)(command, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}
exports.execPromise = execPromise;
function checkCannonVersion(currentVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        const latestVersion = yield execPromise('npm view @usecannon/cli version');
        if (currentVersion !== latestVersion) {
            console.warn((0, chalk_1.yellowBright)(`⚠️  There is a new version of Cannon (${latestVersion})`));
            console.warn((0, chalk_1.yellow)('Upgrade with ' + (0, chalk_1.bold)('npm install -g @usecannon/cli\n')));
        }
    });
}
exports.checkCannonVersion = checkCannonVersion;
function loadPackageJson(filepath) {
    try {
        return require(filepath);
    }
    catch (_) {
        return { name: '', version: '' };
    }
}
function loadCannonfile(filepath) {
    if (!node_fs_1.default.existsSync(filepath)) {
        throw new Error(`Cannonfile '${filepath}' not found.`);
    }
    const rawDef = toml_1.default.parse(node_fs_1.default.readFileSync(filepath).toString('utf8'));
    const def = new builder_1.ChainDefinition(rawDef);
    const pkg = loadPackageJson(node_path_1.default.join(node_path_1.default.dirname(filepath), 'package.json'));
    const ctx = {
        package: pkg,
        chainId: 31337,
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
exports.loadCannonfile = loadCannonfile;
function findPackage(cannonDirectory, packageName, packageVersion) {
    try {
        const pathname = node_path_1.default.resolve(cannonDirectory, packageName, packageVersion, 'deploy.json');
        const deployFile = node_fs_1.default.readFileSync(pathname);
        return JSON.parse(deployFile.toString());
    }
    catch (_a) {
        console.error((0, chalk_1.redBright)(`Unable to find package ${packageName}:${packageVersion} in ${cannonDirectory}`));
        console.error((0, chalk_1.red)('Download it using the run command or build it from a local cannonfile.'));
        process.exit(1);
    }
}
exports.findPackage = findPackage;
function getChainName(chainId) {
    return types_1.ChainId[chainId] || 'unknown';
}
exports.getChainName = getChainName;
function getChainId(chainName) {
    if (!types_1.ChainId[chainName])
        throw new Error(`Invalid chain "${chainName}"`);
    return types_1.ChainId[chainName];
}
exports.getChainId = getChainId;
