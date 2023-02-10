import _ from 'lodash';
import Debug from 'debug';
import { createDefaultReadRegistry } from '../registry';
import {
  createInitialContext,
  ChainDefinition,
  ChainBuilderRuntime,
  getOutputs,
  CANNON_CHAIN_ID,
  DeploymentInfo,
} from '@usecannon/builder';
import { resolveCliSettings } from '../settings';
import { getProvider, runRpc } from '../rpc';
import { IPFSLoader } from '../util/loader';

const debug = Debug('cannon:cli:alter');

export async function alter(
  packageRef: string,
  chainId: number,
  preset: string,
  meta: any,
  command: 'set-url' | 'set-contract-address' | 'mark-complete',
  targets: string[],
  runtimeOverrides: Partial<ChainBuilderRuntime>
) {
  const cliSettings = resolveCliSettings();

  const variant = `${chainId}-${preset}`;

  // create temporary provider
  // todo: really shouldn't be necessary
  const node = await runRpc({
    port: 30000 + Math.floor(Math.random() * 30000),
  });
  const provider = getProvider(node);

  const resolver = createDefaultReadRegistry(cliSettings);
  const loader = new IPFSLoader(cliSettings.ipfsUrl, resolver);
  const runtime = new ChainBuilderRuntime(
    {
      provider,
      chainId: chainId,
      async getSigner(addr: string) {
        // on test network any user can be conjured
        await provider.send('hardhat_impersonateAccount', [addr]);
        await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
        return provider.getSigner(addr);
      },

      baseDir: null,
      snapshots: false,
      allowPartialDeploy: false,
      ...runtimeOverrides,
    },
    loader
  );

  let startDeployInfo = await loader.readDeploy(packageRef, preset, chainId);

  if (!startDeployInfo) {
    // try loading against the basic deploy
    startDeployInfo = await loader.readDeploy(packageRef, 'main', CANNON_CHAIN_ID);

    if (!startDeployInfo) {
      throw new Error(`deployment not found: ${packageRef} (${variant})`);
    }
  }

  let deployInfo = startDeployInfo;

  const ctx = await createInitialContext(new ChainDefinition(deployInfo.def), meta, {});
  const outputs = await getOutputs(runtime, new ChainDefinition(deployInfo.def), deployInfo.state);

  _.assign(ctx, outputs);

  debug('alter with ctx', ctx);

  // get a list of all deployments the user is requesting
  switch (command) {
    case 'set-url':
      deployInfo = (await loader.readMisc(targets[0])) as DeploymentInfo;
      for (const actionStep in deployInfo.state) {
        delete deployInfo.state[actionStep].chainDump;
        for (const contract in deployInfo.state[actionStep].artifacts.contracts) {
          deployInfo.state[actionStep].artifacts.contracts![contract].deployTxnHash = '';
        }

        for (const txn in deployInfo.state[actionStep].artifacts.txns) {
          deployInfo.state[actionStep].artifacts.txns![txn].hash = '';
        }
      }
      // clear transaction hash for all contracts and transactions
      break;
    case 'set-contract-address':
      // find the steps that deploy contract
      for (const actionStep in deployInfo.state) {
        if (
          deployInfo.state[actionStep].artifacts.contracts &&
          deployInfo.state[actionStep].artifacts.contracts![targets[0]]
        ) {
          deployInfo.state[actionStep].artifacts.contracts![targets[0]].address = targets[1];
          deployInfo.state[actionStep].artifacts.contracts![targets[0]].deployTxnHash = '';
        }
      }

      break;
    case 'mark-complete':
      // compute the state hash for the step
      for (const target of targets) {
        const h = await new ChainDefinition(deployInfo.def).getState(target, runtime, ctx, false);
        deployInfo.state[targets[0]].hash = h;
      }
      // clear txn hash if we have it
      break;
  }

  const newUrl = await loader.putDeploy(deployInfo);

  if (!newUrl) {
    throw new Error('loader is not writable');
  }

  await resolver.publish([packageRef], variant, newUrl);
}
