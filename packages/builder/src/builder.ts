/* eslint-disable @typescript-eslint/no-non-null-assertion */
import _ from 'lodash';
import Debug from 'debug';

import {
  ChainBuilderContext,
  BuildOptions,
} from './types';

import { ChainDefinition } from './definition';

import {
  printChainDefinitionProblems,
} from './util';

const debug = Debug('cannon:builder');

import {
  combineCtx,
  ContractMap,
  DeploymentState,
  TransactionMap,
} from '.';
import { ChainBuilderRuntime } from './runtime';
import { BUILD_VERSION } from './constants';
import { ActionKinds } from './actions';

export enum Events {
  PreStepExecute = 'pre-step-execute',
  PostStepExecute = 'post-step-execute',
  DeployContract = 'deploy-contract',
  DeployTxn = 'deploy-txn',
  DeployExtra = 'deploy-extra',
}

export async function createInitialContext(def: ChainDefinition, pkg: any, opts: BuildOptions): Promise<ChainBuilderContext> {
  const settings: ChainBuilderContext['settings'] = {};

  const pkgSettings = def.getSettings();

  for (const s in pkgSettings) {
    if (opts[s]) {
      settings[s] = opts[s];
    } else if (pkgSettings[s].defaultValue) {
      settings[s] = pkgSettings[s].defaultValue!;
    } else {
      throw new Error(`required setting not supplied: ${s}`);
    }
  }

  return {
    settings,
    chainId: 0,
    timestamp: Math.floor(Date.now() / 1000).toString(),

    package: pkg,

    contracts: {},

    txns: {},

    imports: {},

    extras: {},
  };
}

export async function build(runtime: ChainBuilderRuntime, def: ChainDefinition, state: DeploymentState, initialCtx: ChainBuilderContext): Promise<DeploymentState> {
  debug('preflight');

  const problems = def.checkAll();

  if (problems) {
    throw new Error(`Your cannonfile is invalid: please resolve the following issues before building your project:
${printChainDefinitionProblems(problems)}`);
  }

  if (debug.enabled) {
    console.log(def.printTopology().join('\n'));
  }

  debug('build');

  // sanity check the network
  runtime.checkNetwork();

  initialCtx.chainId = runtime.chainId;

  state = _.cloneDeep(state);

  const tainted = new Set<string>();
  const topologicalActions = def.topologicalActions;

  if (runtime.snapshots) {
    const ctx = _.clone(initialCtx);

    for (const leaf of def.leaves) {
      await buildLayer(runtime, def, ctx, state, leaf, tainted);
    }
  } else {
    for (const n of topologicalActions) {
      let ctx = _.clone(initialCtx);

      for (const dep of def.getDependencies(n)) {
        ctx = combineCtx([ctx, state[dep].ctx]);
      }

      if (state[n].hash !== await def.getState(n, runtime, ctx)) {
        debug('run isolated', n);
        const newCtx = await runStep(runtime, n, def.getConfig(n, ctx), ctx);
        state[n] = {
          ctx: newCtx,
          hash: await def.getState(n, runtime, newCtx),
          version: BUILD_VERSION
        };
      } else {
        debug('skip isolated', n);
        // even if this step has already been completed, there is a possibility that prior steps were executed and had unrelated changes
        // since context is only able to add context, its safe to apply properties to downstream

        state[n].ctx = { ...ctx, ...state[n].ctx };
      }
    }
  }

  return state;
}

async function buildLayer(
  runtime: ChainBuilderRuntime,
  def: ChainDefinition,
  baseCtx: ChainBuilderContext,
  state: DeploymentState,
  cur: string,
  tainted: Set<string> = new Set()
) {
  const layers = def.getStateLayers();

  const layer = layers[cur];

  // if layer is already done
  if (layer.actions.find((a) => state[a])) {
    return;
  }

  // check all dependencies. If the dependency is not done, run the dep layer first
  let isCompleteLayer = true;
  for (const dep of layer.depends) {
    await buildLayer(runtime, def, baseCtx, state, dep, tainted);

    // if a prior layer had to be rebuilt, we must rebuild the current layer as well
    isCompleteLayer = isCompleteLayer && !tainted.has(dep);
  }

  // do all state layers match? if so, load the layer from cache and continue
  if (isCompleteLayer) {
    for (const action of layer.actions) {
      let ctx = _.cloneDeep(baseCtx);
      for (const dep of def.getDependencies(action)) {
        ctx = combineCtx([ctx, state[dep].ctx]);
      }

      if (!state[action] || state[action].hash !== await def.getState(action, runtime, ctx)) {
        isCompleteLayer = false;
        break;
      }
    }
  } else {
    debug(`layer for ${cur} is tainted, not checking hashes`);
  }

  // if we get here, need to run a rebuild of layer
  if (!isCompleteLayer) {
    debug('run to complete layer', layer.actions, layer.depends);
    let ctx = _.cloneDeep(baseCtx);

    await runtime.clearNode();

    for (const dep of layer.depends) {
      ctx = combineCtx([ctx, state[dep].ctx]);

      await runtime.loadState(state[dep].chainDump!);
    }

    let newCtx = _.clone(ctx);
    for (const action of layer.actions) {
      debug('run action in layer', action);
      newCtx = combineCtx([newCtx, await runStep(runtime, action, def.getConfig(action, ctx), _.clone(ctx))]);
    }

    // after all contexts are built, save all of them at the same time
    const chainDump = await runtime.dumpState();

    for (const action of layer.actions) {
      state[action] = {
        ctx: newCtx,
        hash: await def.getState(action, runtime, newCtx),
        version: BUILD_VERSION,
        chainDump,
      }

      tainted.add(action);
    }
  }
}

export async function runStep(runtime: ChainBuilderRuntime, n: string, cfg: any, ctx: ChainBuilderContext) {
  const [type, label] = n.split('.') as [keyof typeof ActionKinds, string];

  runtime.emit(Events.PreStepExecute, type, label, cfg);

  runtime.provider.artifacts = ctx;

  const output = await ActionKinds[type].exec(runtime, ctx, cfg as any, n);

  if (type === 'import') {
    ctx.imports[label] = output;
  } else {
    const contracts = output.contracts as ContractMap;

    for (const contract in contracts) {
      if (ctx.contracts[contract]) {
        // name reused
        throw new Error(
          `duplicate contract label ${contract}. Please double check your cannonfile/scripts to ensure a contract name is used only once.

previous contract deployed at: ${ctx.contracts[contract].address} in step ${ctx.contracts[contract].deployedOn}`
        );
      }

      ctx.contracts[contract] = contracts[contract];
      runtime.emit(Events.DeployContract, n, contracts[contract]);
    }

    const txns = output.txns as TransactionMap;

    for (const txn in txns) {
      if (ctx.txns[txn]) {
        // name reused
        throw new Error(
          `duplicate transaction label ${txn}. Please double check your cannonfile/scripts to ensure a txn name is used only once.

previous txn deployed at: ${ctx.txns[txn].hash} in step ${'tbd'}`
        );
      }

      ctx.txns[txn] = txns[txn];
      runtime.emit(Events.DeployTxn, n, txns[txn]);
    }

    for (const n in output.extras) {
      if (ctx.extras[n]) {
        // name reused
        throw new Error(
          `duplicate extra label ${n}. Please double check your cannonfile/scripts to ensure a txn name is used only once.`
        );
      }

      ctx.extras[n] = output.extras[n];
      runtime.emit(Events.DeployExtra, n, ctx.extras[n]);
    }
  }

  runtime.emit(Events.PostStepExecute, type, label, output);

  return ctx;
}

export async function getOutputs(runtime: ChainBuilderRuntime, def: ChainDefinition, state: DeploymentState): Promise<ChainBuilderContext|null> {

  let ctx = await createInitialContext(def, {}, {});

  for (const leaf of def.leaves) {
    ctx = await combineCtx([ctx, state[leaf].ctx]);
  }

  if (runtime.snapshots) {
    // need to load state as well. the states that we want to load are the "leaf" layers
    const layers = _.uniq(Object.values(def.getStateLayers()));

    layerSearch: for (const layer of layers) {
      for (const action of layer.actions) {
        if (layers.find((l) => l.depends.indexOf(action) !== -1)) {
          // this isnt a leaf
          continue layerSearch;
        }
      }

      await runtime.loadState(state[layer.actions[0]].chainDump!);
    }
  }

  return ctx;
}