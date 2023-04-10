/* eslint-disable @typescript-eslint/no-non-null-assertion */
import _ from 'lodash';
import Debug from 'debug';

import { ChainBuilderContext, BuildOptions, ChainArtifacts, PreChainBuilderContext } from './types';

import { ChainDefinition } from './definition';

import { printChainDefinitionProblems } from './util';

const debug = Debug('cannon:builder');
const debugVerbose = Debug('cannon:verbose:builder');

import { ContractMap, DeploymentState, TransactionMap } from '.';
import { ChainBuilderRuntime, Events } from './runtime';
import { BUILD_VERSION } from './constants';
import { ActionKinds } from './actions';

export async function createInitialContext(
  def: ChainDefinition,
  pkg: any,
  chainId: number,
  opts: BuildOptions
): Promise<ChainBuilderContext> {
  const preCtx: PreChainBuilderContext = {
    package: pkg,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    chainId,
  };

  const settings: ChainBuilderContext['settings'] = {};

  const pkgSettings = def.getSettings(preCtx);

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
    ...preCtx,

    settings,

    contracts: {},

    txns: {},

    imports: {},

    extras: {},
  };
}

export async function build(
  runtime: ChainBuilderRuntime,
  def: ChainDefinition,
  state: DeploymentState,
  initialCtx: ChainBuilderContext
): Promise<DeploymentState> {
  debug('preflight');

  const problems = def.checkAll();

  if (problems) {
    throw new Error(`Your cannonfile is invalid: please resolve the following issues before building your project:
${printChainDefinitionProblems(problems)}`);
  }

  if (debug.enabled) {
    console.log(def.printTopology().join('\n'));
  }

  debug('build', initialCtx.settings);

  // sanity check the network
  await runtime.checkNetwork();

  initialCtx.chainId = runtime.chainId;

  state = _.cloneDeep(state);

  const tainted = new Set<string>();
  const built = new Map<string, ChainArtifacts>();
  const topologicalActions = def.topologicalActions;
  let ctx;

  try {
    if (runtime.snapshots) {
      debug('building by layer');
      ctx = _.clone(initialCtx);

      for (const leaf of def.leaves) {
        await buildLayer(runtime, def, ctx, state, leaf, tainted, built);
      }
    } else {
      debug('building individual');
      doActions: for (const n of topologicalActions) {
        ctx = _.cloneDeep(initialCtx);

        const artifacts: ChainArtifacts = {};

        let depsTainted = false;

        for (const dep of def.getDependencies(n)) {
          if (!built.has(dep)) {
            debug('skip because previous step incomplete');
            runtime.emit(Events.SkipDeploy, n, new Error(`dependency step not completed: ${dep}`), 0);
            continue doActions;
          }

          _.merge(artifacts, built.get(dep));
          depsTainted = depsTainted || tainted.has(dep);
        }

        addOutputsToContext(ctx, artifacts);

        // also add self artifacts here so that we can self-reference from inside the step
        if (state[n]) {
          debug('adding self artifacts to context', state[n].artifacts);
          addOutputsToContext(ctx, state[n].artifacts);
        }

        try {
          const curHash = await def.getState(n, runtime, ctx, depsTainted);

          debug('comparing states', state[n] ? state[n].hash : null, curHash);
          if (!state[n] || (curHash && state[n].hash !== curHash)) {
            debug('run isolated', n);
            const newArtifacts = await runStep(runtime, n, def.getConfig(n, ctx), ctx);
            state[n] = {
              artifacts: newArtifacts,
              hash: curHash,
              version: BUILD_VERSION,
            };
            tainted.add(n);
          } else {
            debug('skip isolated', n);
          }

          built.set(n, _.merge(artifacts, state[n].artifacts));
        } catch (err: any) {
          if (runtime.allowPartialDeploy) {
            runtime.emit(Events.SkipDeploy, n, err, 0);
            continue; // will skip saving the build artifacts, which should block any future jobs from finishing
          } else {
            // make sure its possible to debug the original error
            debug('error', err);

            console.log(`\nCannonfile Context:\n${JSON.stringify(ctx, null, 2)}\n`);
            throw new Error(`failure on step ${n}: ${JSON.stringify(err)}`);
          }
        }
      }
    }
  } catch (err: any) {
    // make sure its possible to debug the original error
    debug('error', err);

    console.log(`\nContext:\n${JSON.stringify(ctx, null, 2)}\n`);
    throw err;
  }

  return state;
}

export async function buildLayer(
  runtime: ChainBuilderRuntime,
  def: ChainDefinition,
  baseCtx: ChainBuilderContext,
  state: DeploymentState,
  cur: string,
  tainted: Set<string> = new Set(),
  built: Map<string, ChainArtifacts> = new Map()
) {
  const layers = def.getStateLayers();

  const layer = layers[cur];

  // if layer is already done
  if (built.has(cur)) {
    return;
  }

  debug('eval build layer name', cur);

  // check all dependencies. If the dependency is not done, run the dep layer first
  let isCompleteLayer = true;
  for (const dep of layer.depends) {
    await buildLayer(runtime, def, baseCtx, state, dep, tainted, built);

    // if a prior layer had to be rebuilt, we must rebuild the current layer as well
    isCompleteLayer = isCompleteLayer && !tainted.has(dep);
  }

  // do all state layers match? if so, load the layer from cache and continue
  for (const action of layer.actions) {
    const ctx = _.cloneDeep(baseCtx);

    const depArtifacts: ChainArtifacts = {};

    for (const dep of def.getDependencies(action)) {
      _.merge(depArtifacts, built.get(dep));
    }

    addOutputsToContext(ctx, depArtifacts);

    // also add self artifacts here so that we can self-reference from inside the step
    if (state[action] && state[action].artifacts) {
      addOutputsToContext(ctx, state[action].artifacts);
    }

    try {
      const curHash = await def.getState(action, runtime, ctx, false);

      if (isCompleteLayer) {
        debug('comparing layer states', state[action] ? state[action].hash : null, curHash);
        if (!state[action] || (curHash && state[action].hash !== curHash)) {
          debug('step', action, 'in layer needs to be rebuilt');
          isCompleteLayer = false;
          break;
        }

        // in case we do not need to rebuild this layer we still need to set the built entry
        built.set(action, _.merge(depArtifacts, state[action].artifacts));
      }
    } catch (err) {
      // make sure its possible to debug the original error
      debug('error', err);

      // now log a more friendly message
      throw new Error(`failure on step ${action}: ${(err as Error).toString()}`);
    }
  }

  // if we get here, need to run a rebuild of layer
  if (!isCompleteLayer) {
    debug('run to complete layer', layer.actions, layer.depends);

    await runtime.clearNode();

    for (const dep of layer.depends) {
      await runtime.loadState(state[dep].chainDump!);
    }

    for (const action of layer.actions) {
      const ctx = _.cloneDeep(baseCtx);

      const depArtifacts: ChainArtifacts = {};

      for (const dep of def.getDependencies(action)) {
        _.merge(depArtifacts, built.get(dep));
      }

      addOutputsToContext(ctx, depArtifacts);

      // also add self artifacts here so that we can self-reference from inside the step
      if (state[action] && state[action].artifacts) {
        debug('adding self artifacts to context', state[action].artifacts);
        addOutputsToContext(ctx, state[action].artifacts);
      }

      debug('run action in layer', action);
      const newArtifacts = await runStep(runtime, action, def.getConfig(action, ctx), _.clone(ctx));

      state[action] = {
        artifacts: newArtifacts,
        hash: await def.getState(action, runtime, ctx, false),
        version: BUILD_VERSION,
        // add the chain dump later once all steps have been executed
      };

      tainted.add(action);
      built.set(action, _.merge(depArtifacts, state[action].artifacts));
    }

    // after all contexts are built, save all of them at the same time
    const chainDump = await runtime.dumpState();

    for (const action of layer.actions) {
      state[action].chainDump = chainDump;
    }
  }
}

export async function runStep(runtime: ChainBuilderRuntime, n: string, cfg: any, ctx: ChainBuilderContext) {
  const [type, label] = n.split('.') as [keyof typeof ActionKinds, string];

  runtime.emit(Events.PreStepExecute, type, label, cfg, 0);

  debugVerbose('ctx for step', n, ctx);

  // if there is an error then this will ensure the stack trace is printed with the latest
  runtime.provider.artifacts = ctx;

  const output = await ActionKinds[type].exec(runtime, ctx, cfg as any, n);

  runtime.emit(Events.PostStepExecute, type, label, output, 0);

  return output;
}

export async function getOutputs(
  runtime: ChainBuilderRuntime,
  def: ChainDefinition,
  state: DeploymentState
): Promise<ChainArtifacts | null> {
  const artifacts: ChainArtifacts = {};

  for (const step of def.topologicalActions) {
    if (state[step] && state[step].artifacts) {
      _.merge(artifacts, state[step].artifacts);
    }
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

  return artifacts;
}

// TODO: this func is dumb but I need to walk through this time period before I want to turn it into something of beauty
function addOutputsToContext(ctx: ChainBuilderContext, outputs: ChainArtifacts) {
  const imports = outputs.imports;

  for (const imp in imports) {
    ctx.imports[imp] = imports[imp];
  }

  const contracts = outputs.contracts as ContractMap;

  for (const contract in contracts) {
    ctx.contracts[contract] = contracts[contract];
  }

  const txns = outputs.txns as TransactionMap;

  for (const txn in txns) {
    ctx.txns[txn] = txns[txn];
  }

  for (const n in outputs.extras) {
    ctx.extras[n] = outputs.extras[n];
  }
}
