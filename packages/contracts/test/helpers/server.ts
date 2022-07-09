import EventEmitter from 'events';
import { subtask } from 'hardhat/config';
import { TASK_NODE_SERVER_READY } from 'hardhat/builtin-tasks/task-names';
import { JsonRpcServer } from 'hardhat/types';

const servers = new EventEmitter();

subtask(TASK_NODE_SERVER_READY).setAction(
  async ({ server }: { server: JsonRpcServer }, hre, runSuper) => {
    servers.emit('ready', server);
    return await runSuper();
  }
);

export default async function waitForServer(): Promise<JsonRpcServer> {
  return new Promise((resolve) => servers.once('ready', resolve));
}
