import { CANNON_CHAIN_ID } from '@usecannon/builder';
import * as viem from 'viem';
import { runRpc } from '@usecannon/cli';
import { subtask } from 'hardhat/config';
import { SUBTASK_RUN_ANVIL_NODE } from '../task-names';

import type { CannonRpcNode, RpcOptions } from '@usecannon/cli/src/rpc';

export type SubtaskRunAnvilNodeResult = CannonRpcNode | undefined;

subtask(SUBTASK_RUN_ANVIL_NODE).setAction(async ({ dryRun, anvilOptions }, hre): Promise<SubtaskRunAnvilNodeResult> => {
  if (hre.network.name === 'hardhat') return;
  if (!dryRun && hre.network.name !== 'cannon') return;

  const nodeOptions: Record<string, any> = {
    accounts: 10, // in hardhat, default is 10
    ...(anvilOptions || {}),
  };

  const rpcOptions: RpcOptions = {};

  if (!nodeOptions.port) {
    nodeOptions.port = hre.config.networks.cannon.port;
  }

  if (!nodeOptions.chainId) {
    nodeOptions.chainId =
      hre.network.name === 'cannon'
        ? CANNON_CHAIN_ID
        : parseInt((await hre.network.provider.request({ method: 'eth_chainId', params: [] })) as string);
  }

  if (hre.network.name !== 'cannon') {
    // dry run fork
    rpcOptions.forkProvider = viem.createPublicClient({ transport: viem.custom(hre.network.provider) });
  }

  return runRpc(nodeOptions, rpcOptions);
});
