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
import { TASK_EXPORT } from '../task-names';
import { exportPackage } from '@usecannon/cli';
import { DEFAULT_CANNON_DIRECTORY } from '@usecannon/cli/dist/src/constants';
task(TASK_EXPORT, 'Export a Cannon package as a zip archive')
    .addPositionalParam('packageName', 'Name and version of the cannon package to export')
    .addOptionalPositionalParam('outputFile', 'Relative path and filename to export package archive')
    .addOptionalParam('directory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
    .setAction(({ directory, packageName, outputFile }, hre) => __awaiter(void 0, void 0, void 0, function* () {
    if (directory === DEFAULT_CANNON_DIRECTORY && hre.config.paths.cannon) {
        directory = hre.config.paths.cannon;
    }
    yield exportPackage(directory, outputFile, packageName);
}));
