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
import { TASK_PACKAGES } from '../task-names';
import { packages } from '@usecannon/cli';
import { DEFAULT_CANNON_DIRECTORY } from '@usecannon/cli/dist/src/constants';
task(TASK_PACKAGES, 'List all packages in the local Cannon directory')
    .addOptionalParam('directory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
    .setAction(({ directory }, hre) => __awaiter(void 0, void 0, void 0, function* () {
    if (directory === DEFAULT_CANNON_DIRECTORY && hre.config.paths.cannon) {
        directory = hre.config.paths.cannon;
    }
    yield packages(directory);
}));
