import _ from 'lodash';
import Debug from 'debug';
import * as viem from 'viem';

import { bold, yellow } from 'chalk';

import { ActionKinds } from '@usecannon/builder/dist/actions';
import { PackageReference } from '@usecannon/builder/dist/package';

import { createDefaultReadRegistry } from '../registry';
import {
  createInitialContext,
  ChainDefinition,
  ChainBuilderRuntime,
  getOutputs,
  CANNON_CHAIN_ID,
  DeploymentInfo,
  StepState,
} from '@usecannon/builder';
import { getMainLoader } from '../loader';
import { resolveCliSettings } from '../settings';
import { resolveWriteProvider } from '../util/provider';

const debug = Debug('cannon:cli:alter');

export async function alter(
  packageRef: string,
  chainId: number,
  providerUrl: string,
  presetArg: string,
  meta: any,
  command: 'set-url' | 'set-contract-address' | 'import' | 'mark-complete' | 'mark-incomplete' | 'migrate-212',
  targets: string[],
  runtimeOverrides: Partial<ChainBuilderRuntime>
) {
  // Handle deprecated preset specification
  let { fullPackageRef } = new PackageReference(packageRef);

  // Once preset arg is removed from the cli args we can remove this logic
  if (presetArg) {
    fullPackageRef = `${fullPackageRef.split('@')[0]}@${presetArg}`;
    console.warn(
      yellow(
        bold(
          'The --preset option will be deprecated soon. Reference presets in the package reference using the format name:version@preset'
        )
      )
    );
  }

  const cliSettings = resolveCliSettings({ providerUrl });

  const { provider } = await resolveWriteProvider(cliSettings, chainId);
  const resolver = await createDefaultReadRegistry(cliSettings);
  const loader = getMainLoader(cliSettings);

  // if chain id is not specified, get it from the provider
  if (!chainId) {
    chainId = await provider.getChainId();
  }

  const runtime = new ChainBuilderRuntime(
    {
      provider,
      chainId: chainId,
      async getSigner(addr: viem.Address) {
        // on test network any user can be conjured
        //await provider.impersonateAccount({ address: addr });
        //await provider.setBalance({ address: addr, value: viem.parseEther('10000') });
        return { address: addr, wallet: provider as viem.WalletClient };
      },
      snapshots: false,
      allowPartialDeploy: false,
      ...runtimeOverrides,
    },
    resolver,
    loader
  );

  let startDeployInfo = await runtime.readDeploy(fullPackageRef, chainId);
  const metaUrl = await resolver.getMetaUrl(fullPackageRef, chainId);

  if (!startDeployInfo) {
    // try loading against the basic deploy
    startDeployInfo = await runtime.readDeploy(fullPackageRef, CANNON_CHAIN_ID);

    if (!startDeployInfo) {
      throw new Error(`deployment not found: ${fullPackageRef} (${chainId})`);
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
          deployInfo.state[actionStep].artifacts.txns![txn].hash = '0x';
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
          // const thisStepConfig = (deployInfo.def as any)[actionStep.split('.')[0]][actionStep.split('.')[1]];

          const newNetworkDeployment = await runtime.readDeploy(fullPackageRef, chainId);

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

    case 'import':
      if (targets.length !== 2) {
        throw new Error(
          'incorrect number of arguments for import. Should be <stepName> <existingArtifacts (comma separated)>'
        );
      }

      {
        const stepName = targets[0];
        const existingKeys = targets[1].split(',');

        const stepAction = ActionKinds[stepName.split('.')[0]];

        if (!stepAction.importExisting) {
          throw new Error(
            `the given step ${stepName} does not support import. Consider using mark-complete, mark-incomplete`
          );
        }

        const def = new ChainDefinition(deployInfo.def);
        const config = def.getConfig(stepName, ctx);

        // some steps may require access to misc artifacts
        await runtime.restoreMisc(deployInfo.miscUrl);

        const importExisting = await stepAction.importExisting(
          runtime,
          ctx,
          config,
          { currentLabel: stepName, name: def.getName(ctx), version: def.getVersion(ctx) },
          existingKeys
        );

        if (deployInfo.state[stepName]) {
          deployInfo.state[stepName].artifacts = importExisting;
        } else {
          debug(`step ${stepName} not found, populating...`);
          try {
            deployInfo.state[stepName] = {} as StepState;

            const ctx = await createInitialContext(new ChainDefinition(deployInfo.def), meta, chainId, deployInfo.options);
            const outputs = await getOutputs(runtime, new ChainDefinition(deployInfo.def), deployInfo.state);

            _.assign(ctx, outputs);

            deployInfo.state[stepName].artifacts = await stepAction.importExisting(
              runtime,
              ctx,
              config,
              { currentLabel: stepName, name: def.getName(ctx), version: def.getVersion(ctx) },
              existingKeys
            );

            // Recompute hash for this step in case there is a mismatch
            const h = await new ChainDefinition(deployInfo.def).getState(stepName, runtime, ctx, false);
            deployInfo.state[stepName].hash = h ? h[0] : null;
          } catch (err) {
            throw new Error(
              `Step ${stepName} not found in deployment state and could not be populated by cannon, here are the available step options: \n ${Object.keys(
                deployInfo.state
              )
                .map((s) => `\n ${s}`)
                .join('\n')}`
            );
          }
        }
      }

      break;
    case 'set-contract-address':
      // find the steps that deploy contract
      for (const actionStep in deployInfo.state) {
        if (
          deployInfo.state[actionStep].artifacts.contracts &&
          deployInfo.state[actionStep].artifacts.contracts![targets[0]]
        ) {
          deployInfo.state[actionStep].artifacts.contracts![targets[0]].address = targets[1] as viem.Address;
          deployInfo.state[actionStep].artifacts.contracts![targets[0]].deployTxnHash = '';
        }
      }

      break;
    case 'mark-complete':
      // compute the state hash for the step
      for (const target of targets) {
        const h = await new ChainDefinition(deployInfo.def).getState(target, runtime, ctx, false);
        deployInfo.state[targets[0]].hash = h ? h[0] : null;
      }
      // clear txn hash if we have it
      break;
    case 'mark-incomplete':
      // invalidate the state hash
      deployInfo.state[targets[0]].hash = 'INCOMPLETE';
      break;
    case 'migrate-212':
      // nested provisions also have to be updated
      for (const k in deployInfo.state) {
        if (k.startsWith('provision.')) {
          const oldUrl = deployInfo.state[k].artifacts.imports![k.split('.')[1]].url;

          const newUrl = await alter(
            `@${oldUrl.split(':')[0]}:${_.last(oldUrl.split('/'))}`,
            chainId,
            providerUrl,
            presetArg,
            meta,
            'migrate-212',
            targets,
            runtimeOverrides
          );

          deployInfo.state[k].artifacts.imports![k.split('.')[1]].url = newUrl;
        }
      }

      // `contract` steps renamed to `deploy`
      // `import` steps renamed to `pull`
      // `provision` steps renamed to `clone`
      // we just need to update the key that the state for these releases is stored on
      deployInfo.state = _.mapKeys(deployInfo.state, (_v, k) => {
        return k
          .replace(/^contract\./, 'deploy.')
          .replace(/^import\./, 'pull.')
          .replace(/^provision\./, 'clone.');
      });
      break;
  }

  const newUrl = await runtime.putDeploy(deployInfo);

  if (!newUrl) {
    throw new Error('loader is not writable');
  }

  await resolver.publish([fullPackageRef], chainId, newUrl, metaUrl || '');

  return newUrl;
}
