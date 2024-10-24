import {
  BUILD_VERSION,
  CANNON_CHAIN_ID,
  ChainBuilderRuntime,
  ChainDefinition,
  createInitialContext,
  DeploymentInfo,
  getOutputs,
  getArtifacts,
  StepState,
  PackageReference,
  ActionKinds,
  addOutputsToContext,
} from '@usecannon/builder';
import Debug from 'debug';
import _ from 'lodash';
import * as viem from 'viem';
import { getMainLoader } from '../loader';
import { createDefaultReadRegistry } from '../registry';
import { CliSettings } from '../settings';
import { warn } from '../util/console';
import { ProviderAction, resolveProvider } from '../util/provider';

const debug = Debug('cannon:cli:alter');

export async function alter(
  packageRef: string,
  subpkg: string[],
  chainId: number,
  cliSettings: CliSettings,
  meta: any,
  command:
    | 'set-url'
    | 'set-misc'
    | 'set-contract-address'
    | 'import'
    | 'mark-complete'
    | 'mark-incomplete'
    | 'migrate-212'
    | 'clean-unused',
  targets: string[],
  runtimeOverrides: Partial<ChainBuilderRuntime>
) {
  const { fullPackageRef } = new PackageReference(packageRef);

  const { provider } = await resolveProvider({ action: ProviderAction.ReadProvider, quiet: true, cliSettings, chainId });
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

  const startDeployInfo = [await runtime.readDeploy(fullPackageRef, chainId)];
  const metaUrl = await resolver.getMetaUrl(fullPackageRef, chainId);

  if (!startDeployInfo[0]) {
    // try loading against the basic deploy
    startDeployInfo[0] = await runtime.readDeploy(fullPackageRef, CANNON_CHAIN_ID);

    if (!startDeployInfo) {
      throw new Error(`deployment not found: ${fullPackageRef} (${chainId})`);
    }
  }

  for (const pathItem of subpkg) {
    debug('load subpkg', pathItem);
    if (!_.last(startDeployInfo)?.state[pathItem]) {
      throw new Error('subpkg path name not found: ' + pathItem);
    }
    startDeployInfo.push(
      await runtime.readBlob(_.last(startDeployInfo)!.state[pathItem].artifacts.imports![pathItem.split('.')[1]].url)
    );
  }

  let deployInfo = startDeployInfo.pop();

  if (!deployInfo) {
    throw new Error(`no alter packages were able to be loaded ${startDeployInfo}`);
  }

  const ctx = await createInitialContext(new ChainDefinition(deployInfo.def), meta, chainId, deployInfo.options);
  const outputs = await getOutputs(runtime, new ChainDefinition(deployInfo.def), deployInfo.state);

  addOutputsToContext(ctx, outputs);

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

    case 'set-misc':
      if (targets.length !== 1) {
        throw new Error('incorrect number of arguments for set-misc. Should be the new misc url');
      }
      deployInfo.miscUrl = targets[0];
      break;

    case 'import':
      if (targets.length !== 2) {
        throw new Error(
          'incorrect number of arguments for import. Should be <operationName> <existingArtifacts (comma separated)>'
        );
      }

      {
        const stepName = targets[0];
        const existingKeys = targets[1].split(',');

        const stepAction = ActionKinds[stepName.split('.')[0]];

        if (!stepAction.importExisting) {
          throw new Error(
            `The given operation ${stepName} does not support import. Consider using mark-complete, mark-incomplete`
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
          { currentLabel: stepName, ref: def.getPackageRef(ctx) },
          existingKeys
        );

        if (deployInfo.state[stepName]) {
          deployInfo.state[stepName].artifacts = importExisting;
        } else {
          debug(`Operation ${stepName} not found, populating...`);
          try {
            deployInfo.state[stepName] = {} as StepState;

            const ctx = await createInitialContext(new ChainDefinition(deployInfo.def), meta, chainId, deployInfo.options);
            const outputs = await getOutputs(runtime, new ChainDefinition(deployInfo.def), deployInfo.state);
            addOutputsToContext(ctx, outputs);

            deployInfo.state[stepName].artifacts = await stepAction.importExisting(
              runtime,
              ctx,
              config,
              { currentLabel: stepName, ref: def.getPackageRef(ctx) },
              existingKeys
            );

            // Recompute hash for this step in case there is a mismatch
            const h = await new ChainDefinition(deployInfo.def).getState(stepName, runtime, ctx, false);
            deployInfo.state[stepName].hash = h ? h[0] : null;
          } catch (err) {
            throw new Error(
              `Operation ${stepName} not found in deployment state and could not be populated by Cannon, here are the available operation options: \n ${Object.keys(
                deployInfo.state
              )
                .map((s) => `\n ${s}`)
                .join('\n')}`
            );
          }
        }
      }

      break;
    case 'set-contract-address': {
      if (targets.length !== 2) {
        throw new Error(
          'incorrect number of arguments for set-contract-address. Should be <operationName> <contract address>'
        );
      }
      const [targetContractName, targetAddress] = targets;

      if (!viem.isAddress(targetAddress)) {
        throw new Error(`Invalid address given: "${targetAddress}"`);
      }

      // find the step that deploy contract
      const [targetStep] = Object.values(deployInfo.state).filter(
        (step) => !!step.artifacts?.contracts?.[targetContractName]
      );

      if (!targetStep) {
        throw new Error(`Could not find contract by step name "${targetContractName}"`);
      }

      debug(`setting "${targetContractName}" address to "${targetAddress}"`);

      targetStep.artifacts!.contracts![targetContractName].address = targetAddress;
      targetStep.artifacts!.contracts![targetContractName].deployTxnHash = '';

      break;
    }
    case 'mark-complete':
      // some steps may require access to misc artifacts
      await runtime.restoreMisc(deployInfo.miscUrl);
      // compute the state hash for the step
      for (const target of targets) {
        if (!deployInfo.state[target]) {
          warn(
            `WARN: action ${target} does not exist in the cannon state for the given package. Setting dummy empty state.`
          );
          deployInfo.state[target] = {
            artifacts: { contracts: {}, txns: {}, extras: {} },
            hash: 'SKIP',
            version: BUILD_VERSION,
          };
        } else {
          deployInfo.state[target].hash = 'SKIP';
        }
      }
      // clear txn hash if we have it
      break;
    case 'mark-incomplete':
      // invalidate the state hash
      for (const target of targets) {
        if (!deployInfo.state[target]) {
          throw new Error(`State does not exist for action ${target}`);
        }
        deployInfo.state[target].hash = 'INCOMPLETE';
      }
      break;
    case 'clean-unused': {
      const def = new ChainDefinition(deployInfo.def);
      for (const notDefinedState of _.difference(Object.keys(deployInfo.state), def.topologicalActions)) {
        debug('delete undefined state', notDefinedState, deployInfo.state[notDefinedState]);
        delete deployInfo.state[notDefinedState];
      }
      break;
    }
    case 'migrate-212':
      // nested provisions also have to be updated
      for (const k in deployInfo.state) {
        if (k.startsWith('provision.')) {
          const oldUrl = deployInfo.state[k].artifacts.imports![k.split('.')[1]].url;

          const newUrl = await alter(
            `@${oldUrl.split(':')[0]}:${_.last(oldUrl.split('/'))}`,
            [],
            chainId,
            cliSettings,
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

  let subpkgUrl = await runtime.putDeploy(deployInfo);

  if (!subpkgUrl) {
    throw new Error('loader is not writable');
  }

  let superPkgDeployInfo;
  let subPkgDeployInfo = deployInfo;
  while ((superPkgDeployInfo = startDeployInfo.pop())) {
    debug('write subpkg to ipfs', subpkgUrl);

    const importsInfo =
      superPkgDeployInfo.state[subpkg[startDeployInfo.length]].artifacts.imports![
        subpkg[startDeployInfo.length].split('.')[1]
      ];
    // need to set the subpkg deployment url
    importsInfo.url = subpkgUrl;

    // also need to set the subpkg artifacts state to match
    const subpkgArts = getArtifacts(new ChainDefinition(subPkgDeployInfo.def), subPkgDeployInfo.state);
    importsInfo.contracts = subpkgArts.contracts;
    importsInfo.imports = subpkgArts.imports;
    importsInfo.txns = subpkgArts.txns;

    subpkgUrl = await runtime.putDeploy(superPkgDeployInfo);

    if (!subpkgUrl) {
      throw new Error('error writing subpkg to loader');
    }

    subPkgDeployInfo = superPkgDeployInfo;
  }

  await resolver.publish([fullPackageRef], chainId, subpkgUrl, metaUrl || '');

  return subpkgUrl;
}
