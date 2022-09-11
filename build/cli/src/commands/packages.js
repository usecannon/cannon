var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { resolve } from 'path';
import fs from 'fs-extra';
import prompts from 'prompts';
import { bold, magentaBright } from 'chalk';
import untildify from 'untildify';
import { inspect } from './inspect';
export function packages(cannonDirectory) {
    return __awaiter(this, void 0, void 0, function* () {
        cannonDirectory = untildify(cannonDirectory);
        const packages = yield fs.readdir(cannonDirectory);
        const packageChoices = packages.sort().map((s) => {
            return { title: s };
        });
        console.log(bold(magentaBright(`The following packages are in ${cannonDirectory}`)));
        const { pickedPackageName } = yield prompts.prompt([
            {
                type: 'autocomplete',
                name: 'pickedPackageName',
                message: 'Select a package to view available versions:',
                choices: packageChoices,
                suggest: suggestBySubtring,
            },
        ]);
        const versions = yield fs.readdir(resolve(cannonDirectory, pickedPackageName));
        const versionChoices = versions.sort().map((s) => {
            return { title: s };
        });
        const { pickedVersionName } = yield prompts.prompt([
            {
                type: 'autocomplete',
                name: 'pickedVersionName',
                message: 'Select a package version to inspect:',
                choices: versionChoices,
                suggest: suggestBySubtring,
            },
        ]);
        yield inspect(cannonDirectory, `${pickedPackageName}:${pickedVersionName}`, false);
    });
}
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
