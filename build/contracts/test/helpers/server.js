var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import EventEmitter from 'events';
import { subtask } from 'hardhat/config';
import { TASK_NODE_SERVER_READY } from 'hardhat/builtin-tasks/task-names';
const servers = new EventEmitter();
subtask(TASK_NODE_SERVER_READY).setAction(({ server }, hre, runSuper) => __awaiter(void 0, void 0, void 0, function* () {
    servers.emit('ready', server);
    return yield runSuper();
}));
export default function waitForServer() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => servers.once('ready', resolve));
    });
}
