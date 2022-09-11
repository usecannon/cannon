"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePackagesArguments = exports.parsePackageArguments = exports.parseSettings = exports.parseInteger = exports.parsePackageRef = void 0;
const lodash_1 = __importDefault(require("lodash"));
const commander_1 = require("commander");
const packageRegExp = /^(?<name>[a-z0-9][a-z0-9-]+[a-z0-9])(?::(?<version>.+))?$/;
const settingRegExp = /^(?<key>[a-z0-9-_]+)=(?<value>.*)$/i;
function parsePackageRef(val) {
    const match = val.match(packageRegExp);
    if (!match) {
        throw new commander_1.InvalidArgumentError(`Invalid package name "${val}". Should be of the format <package-name>:<version>`);
    }
    const { name, version = 'latest' } = match.groups;
    return { name, version };
}
exports.parsePackageRef = parsePackageRef;
function parseInteger(val) {
    const parsedValue = Number.parseInt(val);
    if (Number.isNaN(parsedValue)) {
        throw new commander_1.InvalidArgumentError(`Invalid number "${val}"`);
    }
    return parsedValue;
}
exports.parseInteger = parseInteger;
function parseSettings(values = []) {
    const settings = {};
    for (const val of values) {
        const settingMatch = val.match(settingRegExp);
        if (!settingMatch) {
            throw new commander_1.InvalidArgumentError(`Invalid custom setting given ${val}`);
        }
        const { key, value } = settingMatch.groups;
        settings[key] = value;
    }
    return settings;
}
exports.parseSettings = parseSettings;
function parsePackageArguments(val, result) {
    const packageMatch = val.match(packageRegExp);
    if (!result && !packageMatch) {
        throw new commander_1.InvalidArgumentError('First argument should be a cannon package name, e.g.: greeter:1.0.0');
    }
    if (result && !lodash_1.default.isEmpty(result) && packageMatch) {
        throw new commander_1.InvalidArgumentError('You can only specify a single cannon package');
    }
    if (packageMatch) {
        const { name, version = 'latest' } = packageMatch.groups;
        const def = {
            name,
            version,
            settings: {},
        };
        return def;
    }
    const settingMatch = val.match(settingRegExp);
    if (settingMatch) {
        const { key, value } = settingMatch.groups;
        result.settings[key] = value;
        return result;
    }
    throw new commander_1.InvalidArgumentError(`Invalid argument given ${val}`);
}
exports.parsePackageArguments = parsePackageArguments;
function parsePackagesArguments(val, result = []) {
    const packageMatch = val.match(packageRegExp);
    if (packageMatch) {
        const { name, version = 'latest' } = packageMatch.groups;
        const def = {
            name,
            version,
            settings: {},
        };
        result.push(def);
        return result;
    }
    const settingMatch = val.match(settingRegExp);
    if (settingMatch) {
        if (!result.length)
            throw new commander_1.InvalidArgumentError('Missing package definition before setting');
        const { key, value } = settingMatch.groups;
        const def = result[result.length - 1];
        def.settings[key] = value;
        return result;
    }
    throw new commander_1.InvalidArgumentError(`Invalid argument given ${val}`);
}
exports.parsePackagesArguments = parsePackagesArguments;
