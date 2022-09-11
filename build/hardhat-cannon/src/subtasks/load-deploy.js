var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import path from 'path';
import { HardhatPluginError } from 'hardhat/plugins';
import { subtask } from 'hardhat/config';
import { SUBTASK_LOAD_DEPLOY } from '../task-names';
subtask(SUBTASK_LOAD_DEPLOY).setAction(({ file }, hre) => __awaiter(void 0, void 0, void 0, function* () {
    const filepath = path.resolve(hre.config.paths.root, file);
    try {
        return yield import(filepath);
    }
    catch (err) {
        if (err && err.code === 'MODULE_NOT_FOUND') {
            throw new HardhatPluginError('cannon', `Deployment file '${filepath}' not found.`);
        }
        throw err;
    }
}));
