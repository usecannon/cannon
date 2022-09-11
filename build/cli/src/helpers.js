var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import os from 'node:os';
import { exec, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import prompts from 'prompts';
import { magentaBright, yellowBright, yellow, bold, redBright, red } from 'chalk';
import toml from '@iarna/toml';
import { ChainDefinition } from '@usecannon/builder';
import { ChainId } from './types';
export function setupAnvil() {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO Setup anvil using https://github.com/foundry-rs/hardhat/tree/develop/packages/easy-foundryup
        //      It also works when the necessary foundry binary is not on PATH
        const versionDate = yield getAnvilVersionDate();
        if (versionDate) {
            // Confirm we have a version after the anvil_loadState/anvil_dumpState functionality was added.
            if (versionDate.getTime() < 1657679573421) {
                const anvilResponse = yield prompts({
                    type: 'confirm',
                    name: 'confirmation',
                    message: 'Cannon requires a newer version of Foundry. Install it now?',
                    initial: true,
                });
                if (anvilResponse.confirmation) {
                    console.log(magentaBright('Upgrading Foundry to the latest version...'));
                    yield execPromise('foundryup');
                }
                else {
                    process.exit();
                }
            }
        }
        else {
            const response = yield prompts({
                type: 'confirm',
                name: 'confirmation',
                message: 'Cannon requires Foundry. Install it now?',
                initial: true,
            });
            if (response.confirmation) {
                console.log(magentaBright('Installing Foundry...'));
                yield execPromise('curl -L https://foundry.paradigm.xyz | bash');
                yield execPromise(os.homedir() + '/.foundry/bin/foundryup');
            }
            else {
                process.exit();
            }
        }
    });
}
function getAnvilVersionDate() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const child = yield spawnSync('anvil', ['--version']);
            const output = child.stdout.toString();
            const timestamp = output.substring(output.indexOf('(') + 1, output.lastIndexOf(')')).split(' ')[1];
            return new Date(timestamp);
        }
        catch (_a) {
            return false;
        }
    });
}
export function execPromise(command) {
    return new Promise(function (resolve, reject) {
        exec(command, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}
export function checkCannonVersion(currentVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        const latestVersion = yield execPromise('npm view @usecannon/cli version');
        if (currentVersion !== latestVersion) {
            console.warn(yellowBright(`⚠️  There is a new version of Cannon (${latestVersion})`));
            console.warn(yellow('Upgrade with ' + bold('npm install -g @usecannon/cli\n')));
        }
    });
}
function loadPackageJson(filepath) {
    try {
        return require(filepath);
    }
    catch (_) {
        return { name: '', version: '' };
    }
}
export function loadCannonfile(filepath) {
    if (!fs.existsSync(filepath)) {
        throw new Error(`Cannonfile '${filepath}' not found.`);
    }
    const rawDef = toml.parse(fs.readFileSync(filepath).toString('utf8'));
    const def = new ChainDefinition(rawDef);
    const pkg = loadPackageJson(path.join(path.dirname(filepath), 'package.json'));
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
export function findPackage(cannonDirectory, packageName, packageVersion) {
    try {
        const pathname = path.resolve(cannonDirectory, packageName, packageVersion, 'deploy.json');
        const deployFile = fs.readFileSync(pathname);
        return JSON.parse(deployFile.toString());
    }
    catch (_a) {
        console.error(redBright(`Unable to find package ${packageName}:${packageVersion} in ${cannonDirectory}`));
        console.error(red('Download it using the run command or build it from a local cannonfile.'));
        process.exit(1);
    }
}
export function getChainName(chainId) {
    return ChainId[chainId] || 'unknown';
}
export function getChainId(chainName) {
    if (!ChainId[chainName])
        throw new Error(`Invalid chain "${chainName}"`);
    return ChainId[chainName];
}
