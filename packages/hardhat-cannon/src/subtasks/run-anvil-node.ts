import { CANNON_CHAIN_ID } from '@usecannon/builder';
import { runRpc } from '@usecannon/cli';
import { subtask } from 'hardhat/config';
import { SUBTASK_RUN_ANVIL_NODE } from '../task-names';

import type { CannonRpcNode, RpcOptions } from '@usecannon/cli/src/rpc';
import type { AnvilOptions } from '@usecannon/cli/src/util/anvil';

export type SubtaskRunAnvilNodeResult = CannonRpcNode | undefined;

subtask(SUBTASK_RUN_ANVIL_NODE).setAction(async ({ dryRun, anvilOptions }, hre): Promise<SubtaskRunAnvilNodeResult> => {
  if (hre.network.name === 'hardhat') return;
  if (!dryRun && hre.network.name !== 'cannon') return;

  const nodeOptions: AnvilOptions = {
    ...(anvilOptions || {}),
  };

  const rpcOptions: RpcOptions = {};

  if (!nodeOptions.port) {
    nodeOptions.port = hre.config.networks.cannon.port;
  }

  if (!nodeOptions.chainId) {
    nodeOptions.chainId =
      hre.network.name === 'cannon' ? CANNON_CHAIN_ID : (await (hre as any).ethers.provider.getNetwork()).chainId;
  }

  return runRpc(nodeOptions, rpcOptions);
});
