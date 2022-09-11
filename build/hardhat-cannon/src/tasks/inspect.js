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
import { TASK_INSPECT } from '../task-names';
import { inspect } from '@usecannon/cli';
task(TASK_INSPECT, 'Inspect the details of a Cannon package')
    .addPositionalParam('packageName', 'Name and version of the cannon package to inspect')
    .addFlag('json', 'Output as JSON')
    .setAction(({ packageName, json }, hre) => __awaiter(void 0, void 0, void 0, function* () {
    yield inspect(hre.config.paths.cannon, packageName, json);
}));
