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
exports.packages = void 0;
const path_1 = require("path");
const fs_extra_1 = __importDefault(require("fs-extra"));
const prompts_1 = __importDefault(require("prompts"));
const chalk_1 = require("chalk");
const untildify_1 = __importDefault(require("untildify"));
const inspect_1 = require("./inspect");
function packages(cannonDirectory) {
    return __awaiter(this, void 0, void 0, function* () {
        cannonDirectory = (0, untildify_1.default)(cannonDirectory);
        const packages = yield fs_extra_1.default.readdir(cannonDirectory);
        const packageChoices = packages.sort().map((s) => {
            return { title: s };
        });
        console.log((0, chalk_1.bold)((0, chalk_1.magentaBright)(`The following packages are in ${cannonDirectory}`)));
        const { pickedPackageName } = yield prompts_1.default.prompt([
            {
                type: 'autocomplete',
                name: 'pickedPackageName',
                message: 'Select a package to view available versions:',
                choices: packageChoices,
                suggest: suggestBySubtring,
            },
        ]);
        const versions = yield fs_extra_1.default.readdir((0, path_1.resolve)(cannonDirectory, pickedPackageName));
        const versionChoices = versions.sort().map((s) => {
            return { title: s };
        });
        const { pickedVersionName } = yield prompts_1.default.prompt([
            {
                type: 'autocomplete',
                name: 'pickedVersionName',
                message: 'Select a package version to inspect:',
                choices: versionChoices,
                suggest: suggestBySubtring,
            },
        ]);
        yield (0, inspect_1.inspect)(cannonDirectory, `${pickedPackageName}:${pickedVersionName}`, false);
    });
}
exports.packages = packages;
// filters choices by subtrings that don't have to be continuous e.g. 'ybtc' will match 'SynthsBTC'
const suggestBySubtring = (input, choices) => Promise.resolve(choices.filter((choice) => {
    const titleStr = choice.title.toLowerCase();
    let index = 0;
    for (const c of input.toLowerCase()) {
        index = titleStr.indexOf(c, index);
        if (index === -1) {
            return false; // not found
        }
        else {
            index += 1; // start from next index
        }
    }
    return true;
}));
