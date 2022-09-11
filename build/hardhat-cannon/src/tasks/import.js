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
import { importPackage } from '@usecannon/cli';
import { TASK_IMPORT } from '../task-names';
import { DEFAULT_CANNON_DIRECTORY } from '@usecannon/cli/dist/src/constants';
task(TASK_IMPORT, 'Import a Cannon package from a zip archive')
    .addPositionalParam('importFile', 'Relative path and filename to package archive')
    .addOptionalParam('directory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
    .setAction(({ importFile, directory }, hre) => __awaiter(void 0, void 0, void 0, function* () {
    if (directory === DEFAULT_CANNON_DIRECTORY && hre.config.paths.cannon) {
        directory = hre.config.paths.cannon;
    }
    yield importPackage(directory, importFile);
}));
