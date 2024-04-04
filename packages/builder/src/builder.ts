import Debug from 'debug';
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import _ from 'lodash';
import { ContractMap, DeploymentState, TransactionMap } from './';
import { ActionKinds } from './actions';
import { BUILD_VERSION } from './constants';
import { ChainDefinition } from './definition';
import { ChainBuilderRuntime, Events } from './runtime';
import { BuildOptions, ChainArtifacts, ChainBuilderContext, PackageState, PreChainBuilderContext } from './types';
import { printChainDefinitionProblems } from './util';

const debug = Debug('cannon:builder');
const debugVerbose = Debug('cannon:verbose:builder');

// a step is considered failed if it takes longer than 5 minutes always
const DEFAULT_STEP_TIMEOUT = 300000;

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
    overrideSettings: opts,
  };

  return {
    ...preCtx,

    contracts: {},

    txns: {},

    imports: {},

    settings: _.clone(opts),
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

  debug('build', initialCtx.settings);

  // sanity check the network
  await runtime.checkNetwork();

  initialCtx.chainId = runtime.chainId;

  state = _.cloneDeep(state);

  const tainted = new Set<string>();
  const built = new Map<string, ChainArtifacts>();
  const topologicalActions = def.topologicalActions;
  let ctx;

  const name = def.getName(initialCtx);
  const version = def.getVersion(initialCtx);

  // whether or not source code is included in deployment artifacts or not is controlled by cannonfile config, so we set it here
  runtime.setPublicSourceCode(def.isPublicSourceCode());

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
        debug(`check action ${n}`);
        if (runtime.isCancelled()) {
          debug('runtime cancelled');
          break;
        }

        ctx = _.cloneDeep(initialCtx);

        const artifacts: ChainArtifacts = {};

        let depsTainted = false;

        for (const dep of def.getDependencies(n)) {
          if (!built.has(dep)) {
            debug(`skip ${n} because previous step incomplete`);
            runtime.emit(Events.SkipDeploy, n, new Error(`dependency step not completed: ${dep}`), 0);
            continue doActions;
          }

          _.merge(artifacts, built.get(dep));
          depsTainted = depsTainted || tainted.has(dep);
        }

        addOutputsToContext(ctx, artifacts);

        if (state[n]) {
          if (state[n].version > BUILD_VERSION) {
            throw new Error('incompatible (newer) build version. please update cannon.');
          }

          // also add self artifacts here so that we can self-reference from inside the step
          debug('adding self artifacts to context', state[n].artifacts);
          addOutputsToContext(ctx, state[n].artifacts);
        }

        try {
          const curHashes = await def.getState(n, runtime, ctx, depsTainted);

          debug('comparing states', state[n] ? state[n].hash : null, curHashes);
          if (!state[n] || (curHashes && !curHashes.includes(state[n].hash || ''))) {
            debug('run isolated', n);
            const newArtifacts = await runStep(runtime, { name, version, currentLabel: n }, def.getConfig(n, ctx), ctx);

            // some steps may be self introspective, causing a step to be giving the wrong hash initially. to counteract this, we recompute the hash
            addOutputsToContext(ctx, newArtifacts);
            const newStates = await def.getState(n, runtime, ctx, depsTainted);
            state[n] = {
              artifacts: newArtifacts,
              hash: newStates ? newStates[0] : null,
              version: BUILD_VERSION,
            };
            tainted.add(n);
          } else {
            debug('skip isolated', n);
          }

          built.set(n, _.merge(artifacts, state[n].artifacts));
        } catch (err: any) {
          debug('got error', err);
          if (runtime.allowPartialDeploy) {
            runtime.emit(Events.SkipDeploy, n, err, 0);
            continue; // will skip saving the build artifacts, which should block any future jobs from finishing
          } else {
            // make sure its possible to debug the original error
            debug('error', err);
            debugVerbose('context', JSON.stringify(ctx, null, 2));
            throw err;
          }
        }
      }
    }
  } catch (err: any) {
    // make sure its possible to debug the original error
    debug('error', err);
    debugVerbose('context', JSON.stringify(ctx, null, 2));
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

  const name = def.getName(baseCtx);
  const version = def.getVersion(baseCtx);

  // check all dependencies. If the dependency is not done, run the dep layer first
  let isCompleteLayer = true;
  for (const dep of layer.depends) {
    // this doesn't catch all cases of cycles but as a sanity check it works surprisingly well
    if (dep === cur) {
      throw new Error(`layer depends on itself: ${cur}`);
    }
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

    if (state[action] && state[action].artifacts) {
      if (state[action].version > BUILD_VERSION) {
        throw new Error('incompatible (newer) build version. please update cannon.');
      }

      // also add self artifacts here so that we can self-reference from inside the step
      addOutputsToContext(ctx, state[action].artifacts);
    }

    try {
      const curHashes = await def.getState(action, runtime, ctx, false);

      if (isCompleteLayer) {
        debug('comparing layer states', state[action] ? state[action].hash : null, curHashes);
        if (!state[action] || (curHashes && !curHashes.includes(state[action].hash || ''))) {
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
      throw new Error(`Failure on step ${action}: ${(err as Error).toString()}`);
    }
  }

  // if we get here, need to run a rebuild of layer
  if (!isCompleteLayer) {
    debug('run to complete layer', layer.actions, layer.depends);

    await runtime.clearNode();

    for (const dep of layer.depends) {
      if (state[dep].chainDump) {
        // chain dump may not exist if the package is a little older
        await runtime.loadState(state[dep].chainDump!);
      } else {
        debug('warning: chain dump not recorded for layer:', dep);
      }
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
      const newArtifacts = await runStep(
        runtime,
        {
          name,
          version,
          currentLabel: action,
        },
        def.getConfig(action, ctx),
        _.clone(ctx)
      );

      addOutputsToContext(ctx, newArtifacts);

      const newHashes = await def.getState(action, runtime, ctx, false);
      state[action] = {
        artifacts: newArtifacts,
        hash: newHashes ? newHashes[0] : null,
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

export async function runStep(runtime: ChainBuilderRuntime, pkgState: PackageState, cfg: any, ctx: ChainBuilderContext) {
  const [type, label] = pkgState.currentLabel.split('.') as [keyof typeof ActionKinds, string];

  runtime.emit(Events.PreStepExecute, type, label, cfg, 0);

  debugVerbose('ctx for step', pkgState.currentLabel, ctx);

  // if there is an error then this will ensure the stack trace is printed with the latest
  runtime.updateProviderArtifacts(ctx);

  const result = await Promise.race([
    ActionKinds[type].exec(runtime, ctx, cfg as any, pkgState),
    new Promise<false>((resolve) => setTimeout(() => resolve(false), ActionKinds[type].timeout || DEFAULT_STEP_TIMEOUT)),
  ]);

  if (result === false) {
    throw new Error('timed out without error');
  }

  runtime.emit(Events.PostStepExecute, type, label, cfg, ctx, result, 0);

  return result;
}

export function getArtifacts(def: ChainDefinition, state: DeploymentState) {
  const artifacts: ChainArtifacts = {};

  for (const step of def.topologicalActions) {
    if (state[step] && state[step].artifacts) {
      _.merge(artifacts, state[step].artifacts);
    }
  }

  return artifacts;
}

export async function getOutputs(
  runtime: ChainBuilderRuntime,
  def: ChainDefinition,
  state: DeploymentState
): Promise<ChainArtifacts | null> {
  const artifacts = getArtifacts(def, state);
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

      if (state[layer.actions[0]]?.chainDump) {
        await runtime.loadState(state[layer.actions[0]].chainDump!);
      } else {
        debug(`warning: state dump not recorded for ${layer.actions[0]}`);
      }
    }
  }

  return artifacts;
}

// TODO: this func is dumb but I need to walk through this time period before I want to turn it into something of beauty
export function addOutputsToContext(ctx: ChainBuilderContext, outputs: ChainArtifacts) {
  const imports = outputs.imports;
  for (const imp in imports) {
    ctx.imports[imp] = imports[imp];
  }

  //helper function for recursively adding simplified imports notation
  function addImports(ctx: ChainBuilderContext, imports: any, parentObject: any = null): void {
    Object.keys(imports).forEach((key) => {
      const currentImport = imports[key];
      let targetObject = parentObject;

      if (!targetObject) {
        targetObject = ctx;
      }

      if (!targetObject[key]) {
        targetObject[key] = { url: currentImport.url };
      } else {
        targetObject[key].url = currentImport.url;
      }

      if (currentImport.imports && Object.keys(currentImport.imports).length > 0) {
        addImports(ctx, currentImport.imports, targetObject[key]);
      }

      if (currentImport.contracts && Object.keys(currentImport.contracts).length > 0) {
        targetObject[key].contracts = currentImport.contracts;
      }
    });
  }

  //add simplified imports syntax
  if (imports) {
    addImports(ctx, outputs.imports);
  }

  const contracts = outputs.contracts as ContractMap;
  for (const contractName in contracts) {
    ctx.contracts[contractName] = contracts[contractName];
    //also add simplified address syntax
    const contractData = contracts[contractName];
    if (contractData && contractData.address) {
      const simplifiedPath = `${contractName}.address`;
      ctx[simplifiedPath] = contractData.address;
    }
  }

  const txns = outputs.txns as TransactionMap;
  for (const txn in txns) {
    ctx.txns[txn] = txns[txn];
  }

  for (const n in outputs.settings) {
    ctx.settings[n] = outputs.settings[n];
  }

  if (!ctx.extras) {
    ctx.extras = {};
  }

  for (const n in outputs.extras) {
    ctx.extras[n] = outputs.extras[n];
  }

  for (const override in ctx.overrideSettings) {
    ctx.settings[override] = ctx.overrideSettings[override];
  }

  for (const n in ctx.settings) {
    ctx.extras[n] = ctx.settings[n];
  }
}
