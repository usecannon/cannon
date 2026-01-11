import { CANNON_CHAIN_ID } from '@usecannon/builder';
import * as viem from 'viem';
import { runRpc } from '@usecannon/cli';

import type { CannonRpcNode, RpcOptions } from '@usecannon/cli/src/rpc.js';
import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';

export type SubtaskRunAnvilNodeResult = CannonRpcNode | undefined;

export async function runAnvilNode({ dryRun, anvilOptions }: { dryRun: boolean, anvilOptions: any }, hre: HardhatRuntimeEnvironment): Promise<SubtaskRunAnvilNodeResult> {
  if (hre.globalOptions.network === 'hardhat') return;
  if (!dryRun && hre.globalOptions.network !== 'cannon') return;

  const nodeOptions: Record<string, any> = {
    accounts: 10, // in hardhat, default is 10
    ...(anvilOptions || {}),
  };

  const rpcOptions: RpcOptions = {};

  if (!nodeOptions.chainId) {
    nodeOptions.chainId =
      hre.globalOptions.network === 'cannon'
        ? CANNON_CHAIN_ID
        : parseInt((await (await hre.network.connect()).provider.request({ method: 'eth_chainId', params: [] })) as string);
  }

  if (hre.globalOptions.network !== 'cannon') {
    // dry run fork
    rpcOptions.forkProvider = viem.createPublicClient({ transport: viem.custom((await hre.network.connect()).provider) });
  }

  return runRpc(nodeOptions, rpcOptions);
}
