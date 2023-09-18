import _ from 'lodash';
import Debug from 'debug';

import { bold, yellow } from 'chalk';

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
import { getMainLoader } from '../loader';
import { PackageReference } from '@usecannon/builder/dist/package';

const debug = Debug('cannon:cli:alter');

export async function alter(
  packageRef: string,
  chainId: number,
  presetArg: string,
  meta: any,
  command: 'set-url' | 'set-contract-address' | 'mark-complete' | 'mark-incomplete',
  targets: string[],
  runtimeOverrides: Partial<ChainBuilderRuntime>
) {
  const { preset, basePackageRef } = new PackageReference(packageRef);

  if (presetArg && preset) {
    console.warn(
      yellow(
        bold(
          `Duplicate preset definitions in package reference "${basePackageRef}" and in --preset argument: "${presetArg}"`
        )
      )
    );
    console.warn(yellow(bold(`The --preset option is deprecated. Defaulting to package reference "${preset}"...`)));
  }

  const selectedPreset = preset || presetArg || 'main';

  const cliSettings = resolveCliSettings();

  const variant = `${chainId}-${selectedPreset}`;

  // create temporary provider
  // todo: really shouldn't be necessary
  const node = await runRpc({
    port: 30000 + Math.floor(Math.random() * 30000),
  });
  const provider = getProvider(node);

  const resolver = await createDefaultReadRegistry(cliSettings);
  const loader = getMainLoader(cliSettings);
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
      snapshots: false,
      allowPartialDeploy: false,
      ...runtimeOverrides,
    },
    resolver,
    loader
  );

  let startDeployInfo = await runtime.readDeploy(basePackageRef, selectedPreset, chainId);
  const metaUrl = await resolver.getMetaUrl(basePackageRef, `${chainId}-${selectedPreset}`);

  if (!startDeployInfo) {
    // try loading against the basic deploy
    startDeployInfo = await runtime.readDeploy(basePackageRef, 'main', CANNON_CHAIN_ID);

    if (!startDeployInfo) {
      throw new Error(`deployment not found: ${basePackageRef} (${variant})`);
    }
  }

  let deployInfo = startDeployInfo;

  const ctx = await createInitialContext(new ChainDefinition(deployInfo.def), meta, chainId, deployInfo.options);
  const outputs = await getOutputs(runtime, new ChainDefinition(deployInfo.def), deployInfo.state);

  _.assign(ctx, outputs);

  debug('alter with ctx', ctx);

  // get a list of all deployments the user is requesting
  switch (command) {
    case 'set-url':
      deployInfo = (await runtime.readBlob(targets[0])) as DeploymentInfo;
      for (const actionStep in deployInfo.state) {
        delete deployInfo.state[actionStep].chainDump;
        for (const contract in deployInfo.state[actionStep].artifacts.contracts) {
          deployInfo.state[actionStep].artifacts.contracts![contract].deployTxnHash = '';
        }

        for (const txn in deployInfo.state[actionStep].artifacts.txns) {
          deployInfo.state[actionStep].artifacts.txns![txn].hash = '';
        }

        for (const imp in deployInfo.state[actionStep].artifacts.imports) {
          // try to find the equivalent deployment for this network
          const thisNetworkState: DeploymentInfo = await runtime.readBlob(
            deployInfo.state[actionStep].artifacts.imports![imp].url
          );

          const thisNetworkDefinition = new ChainDefinition(thisNetworkState.def);

          const ctx = await createInitialContext(thisNetworkDefinition, thisNetworkState.meta, chainId, {});

          const name = thisNetworkDefinition.getName(ctx);
          const version = thisNetworkDefinition.getVersion(ctx);

          // TODO: we should store preset info in the destination output, not config
          const thisStepConfig = (deployInfo.def as any)[actionStep.split('.')[0]][actionStep.split('.')[1]];

          const newNetworkDeployment = await runtime.readDeploy(
            `${name}:${version}`,
            thisStepConfig.preset || thisStepConfig.targetPreset || 'main',
            chainId
          );

          if (!newNetworkDeployment) {
            throw new Error(`could not find network deployment for dependency package: ${name}:${version}`);
          }

          deployInfo.state[actionStep].artifacts.imports![imp] = _.assign(
            { url: '' },
            await getOutputs(runtime, new ChainDefinition(newNetworkDeployment.def), newNetworkDeployment.state)
          );
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
    case 'mark-incomplete':
      // invalidate the state hash
      deployInfo.state[targets[0]].hash = 'INCOMPLETE';
      break;
  }

  const newUrl = await runtime.putDeploy(deployInfo);

  if (!newUrl) {
    throw new Error('loader is not writable');
  }

  console.log(newUrl);

  await resolver.publish([basePackageRef], variant, newUrl, metaUrl || '');
}
