import crypto from 'crypto';
import Debug from 'debug';
import _ from 'lodash';
import { ActionKinds, RawChainDefinition, validateConfig } from './actions';
import { ChainBuilderRuntime } from './runtime';
import { chainDefinitionSchema } from './schemas';
import { CannonHelperContext, ChainBuilderContext } from './types';

const debug = Debug('cannon:builder:definition');
const debugVerbose = Debug('cannon:verbose:builder:definition');

export type ChainDefinitionProblems = {
  invalidSchema: any;
  missing: { action: string; dependency: string }[];
  cycles: string[][];
};

export type StateLayers = {
  [key: string]: {
    actions: string[];
    depends: string[];
  };
};

export function validatePackageName(n: string) {
  if (n.length < 3) {
    throw new Error('package name must be at least 3 characters long');
  }

  if (n.length > 31) {
    throw new Error('package name must be at most 31 characters long');
  }

  if (_.last(n) == '-' || _.first(n) == '-') {
    throw new Error('first and last character of package name must not be dash (-)');
  }

  if (!n.match(/^[0-9a-z-]*$/)) {
    throw new Error('cannon packages can only have names connecting lowercase, alphanumeric characters, and dashes');
  }
}

export function validatePackageVersion(v: string) {
  if (v.length > 31) {
    throw new Error('package version must be at most 31 characters long');
  }
}

export class ChainDefinition {
  private raw: RawChainDefinition;
  private sensitiveDependencies: boolean;

  readonly allActionNames: string[];

  // actions which have no dependencies
  readonly roots: Set<string>;

  // actions which are not depended on by anything
  readonly leaves: Set<string>;

  private cachedLayers: StateLayers | null = null;
  readonly cachedActionDepths = new Map<string, number>();

  readonly dependencyFor = new Map<string, string>();
  readonly resolvedDependencies = new Map<string, string[]>();

  constructor(def: RawChainDefinition, sensitiveDependencies = false) {
    debug('begin chain def init');
    this.raw = def;
    this.sensitiveDependencies = sensitiveDependencies;

    const actions = [];

    // best way to get a list of actions is just to iterate over the entire def, and filter out anything
    // that are not an actions (because those are known)
    const actionsDef = _.omit(def, 'name', 'version', 'preset', 'description', 'keywords');

    // Used to validate that there are not 2 steps with the same name
    const actionNames: string[] = [];

    for (const [action, data] of Object.entries(actionsDef)) {
      for (const name of Object.keys(data as any)) {
        if (actionNames.includes(name)) {
          throw new Error(`Duplicated step name found "${name}"`);
        }

        const fullActionName = `${action}.${name}`;

        // backwards-compatibility: We dont store setting or var names as they can have duplicate names
        if (action !== 'setting' && action !== 'var') {
          actionNames.push(name);
        }

        actions.push(fullActionName);

        if (ActionKinds[action] && ActionKinds[action].getOutputs) {
          for (const output of ActionKinds[action].getOutputs!(_.get(def, fullActionName), {
            // TODO: what to do about name and version? do they even matter?
            name: '',
            version: '',
            currentLabel: fullActionName,
          })) {
            debug(`deps: ${fullActionName} provides ${output}`);
            if (!this.dependencyFor.has(output)) {
              this.dependencyFor.set(output, fullActionName);
            } else {
              throw new Error(`output clash: both ${this.dependencyFor.get(output)} and ${fullActionName} output ${output}`);
            }
          }
        }
      }
    }

    // do some preindexing
    this.allActionNames = _.sortBy(actions, _.identity);

    debug('start check cycles');

    const cycles = this.checkCycles();

    if (cycles) {
      throw new Error(`the following dependency cycle was found in your chain definition:\n${cycles.join('\n')}`);
    }

    debug('no cycles found');

    // get all dependencies, and filter out the extraneous
    for (const action of this.allActionNames) {
      debug(`compute dependencies for ${action}`);
      this.resolvedDependencies.set(action, this.computeDependencies(action));
    }

    debug('finished resolving dependencies');

    this.roots = new Set(this.allActionNames.filter((n) => !this.getDependencies(n).length));

    debug(`computed roots: ${Array.from(this.roots.values()).join(', ')}`);

    this.leaves = new Set(
      _.difference(
        this.allActionNames,
        _.chain(this.allActionNames)
          .map((n) => this.getDependencies(n))
          .flatten()
          .uniq()
          .value()
      )
    );

    debug('start check all');
    this.checkAll();
    debug('end check all');

    const extraneousDeps = this.checkExtraneousDependencies();

    debug('found extraneous deps', extraneousDeps);

    for (const extDep of extraneousDeps) {
      const deps = this.resolvedDependencies.get(extDep.node)!;
      const depIdx = deps.indexOf(extDep.extraneous);
      if (depIdx !== -1) {
        deps.splice(depIdx, 1);
      }
    }

    if (this.checkExtraneousDependencies().length > 0) {
      throw new Error(`extraneous dependencies remain after prune: ${this.checkExtraneousDependencies()}`);
    }

    debug('final depends dump');

    for (const action of this.topologicalActions) {
      debug(`${action} has depends`, this.resolvedDependencies.get(action));
    }

    debug('finished chain def init');
  }

  getName(ctx: ChainBuilderContext) {
    const n = _.template(this.raw.name)(ctx);

    validatePackageName(n);

    return n;
  }

  getVersion(ctx: ChainBuilderContext) {
    const v = _.template(this.raw.version)(ctx);

    validatePackageVersion(v);

    return v;
  }

  getPreset(ctx: ChainBuilderContext) {
    return _.template(this.raw.preset)(ctx) || 'main';
  }

  isPublicSourceCode() {
    return !this.raw.privateSourceCode;
  }

  getConfig(n: string, ctx: ChainBuilderContext) {
    if (_.sortedIndexOf(this.allActionNames, n) === -1) {
      throw new Error(`getConfig step name not found: ${n}`);
    }

    const kind = n.split('.')[0] as keyof typeof ActionKinds;

    if (!ActionKinds[kind]) {
      throw new Error(
        `action kind plugin not installed: "${kind}" (for action: "${n}"). please install the plugin necessary to build this package.`
      );
    }

    validateConfig(ActionKinds[kind].validate, _.get(this.raw, n));

    return ActionKinds[n.split('.')[0] as keyof typeof ActionKinds].configInject(
      { ...ctx, ...CannonHelperContext },
      _.get(this.raw, n),
      {
        name: this.getName(ctx),
        version: this.getVersion(ctx),
        currentLabel: n,
      }
    );
  }

  /**
   * Used to determine if a state needs to be re-run or not
   * @param n action name
   * @param ctx context used to generate configuration for the action
   * @returns string representing the current state of the action
   */
  async getState(
    n: string,
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    tainted: boolean
  ): Promise<string[] | null> {
    const kind = n.split('.')[0] as keyof typeof ActionKinds;

    if (!ActionKinds[kind]) {
      debug('action plugin not installed for state eval:', kind);

      if (tainted) {
        debug('state is tainted for custom plugin. cant recompute state. issuing invalid state.');
        return [];
      } else {
        // no dependencies have changed, though it is possible that a setting inject means this need to be rebuilt
        return null;
      }
    }

    const objs = await ActionKinds[kind].getState(
      runtime,
      { ...ctx, ...CannonHelperContext },
      this.getConfig(n, ctx) as any,
      {
        name: this.getName(ctx),
        version: this.getVersion(ctx),
        currentLabel: n,
      }
    );

    if (!objs) {
      return null;
    } else {
      debugVerbose('creating hash of', objs.map(JSON.stringify as any));
      return objs.map((o) => crypto.createHash('md5').update(JSON.stringify(o)).digest('hex'));
    }
  }

  /**
   * Returns a list of imported cannon packages which would be needed to successfully build this package
   * @param ctx context used for interpolation
   * @returns list of required imported cannon charts
   */
  getRequiredImports(ctx: ChainBuilderContext) {
    if (!this.raw.import) return [];

    // we have to apply templating here, only to the `source`
    // it would be best if the dep was downloaded when it was discovered to be needed, but there is not a lot we
    // can do about this right now
    return _.uniq(
      Object.values(this.raw.import).map((d) => ({
        source: _.template(d.source)(ctx),
        chainId: d.chainId || ctx.chainId,
        preset: _.template(d.preset || 'main')(ctx),
      }))
    );
  }

  /**
   * Get direct dependencies for a given node
   * @param node action to get dependencies for
   * @returns direct dependencies for the specified node
   */
  computeDependencies(node: string) {
    if (!_.get(this.raw, node)) {
      const stepName = node.split('.')[0];
      const stepList: string[] = [];
      Object.keys(_.get(this.raw, stepName)).forEach((dep) => {
        stepList.push(dep);
      });

      throw new Error(`invalid dependency: ${node}. Available "${stepName}" steps:
          ${stepList.map((dep) => `\n - ${stepName}.${dep}`).join('')}
        `);
    }

    const deps = (_.get(this.raw, node)!.depends || []) as string[];

    const n = node.split('.')[0];

    if (!ActionKinds[n]) {
      throw new Error(`Unrecognized action type ${n} at [${node}]`);
    }

    if (ActionKinds[n].getInputs) {
      const accessComputationResults = ActionKinds[n].getInputs!(_.get(this.raw, node), {
        name: '',
        version: '',
        currentLabel: node,
      });

      // Only throw this error if the user hasn't explicitly defined dependencies
      if (this.sensitiveDependencies && accessComputationResults.unableToCompute && !_.get(this.raw, node).depends) {
        throw new Error(
          `Unable to compute dependencies for [${node}] because of advanced logic in template strings. Specify dependencies manually, like "depends = ['${_.uniq(
            _.uniq(accessComputationResults.accesses).map((a) => `${this.dependencyFor.get(a)}`)
          ).join("', '")}']"`
        );
      }

      for (const input of accessComputationResults.accesses) {
        debug(`deps: ${node} consumes ${input}`);
        if (this.dependencyFor.has(input)) {
          deps.push(this.dependencyFor.get(input)!);
        } else if (!input.startsWith('settings.')) {
          debug(`WARNING: dependency ${input} not found for step ${node}`);
        }
      }
    }

    debug(`resolved dependencies for ${node}: ${deps}`);
    return _.uniq(deps);
  }

  getDependencies(node: string) {
    return this.resolvedDependencies.get(node) || [];
  }

  /**
   * @note deps returned in topological order
   * @returns all dependencies reachable from the specfied node, and the depth of the iteration required
   */
  getDependencyTree: (node: string) => [string[], number] = _.memoize((node) => {
    const deps = this.getDependencies(node);

    const allDeps = [];
    let maxDepth = 0;

    for (const dep of deps) {
      const [subDeps, subDepth] = this.getDependencyTree(dep);
      allDeps.push(...subDeps);
      allDeps.push(dep);
      maxDepth = Math.max(maxDepth, subDepth + 1);
    }

    this.cachedActionDepths.set(node, maxDepth);

    return [_.uniq(allDeps), maxDepth];
  });

  get topologicalActions() {
    for (const leaf of this.leaves) {
      const [, maxDepth] = this.getDependencyTree(leaf);
      this.cachedActionDepths.set(leaf, maxDepth);
    }

    return _.sortBy(this.allActionNames, (n) => this.cachedActionDepths.get(n));
  }

  checkAll(): ChainDefinitionProblems | null {
    const invalidSchema = validateConfig(chainDefinitionSchema, this.raw);

    const missing = this.checkMissing();
    const cycle = missing.length ? [] : this.checkCycles();

    if (!missing.length && !cycle) {
      return null;
    }

    return {
      invalidSchema,
      missing,
      cycles: cycle ? [cycle] : [],
    };
  }

  /**
   * Checks for any dependency actions which aren't defined among the given list of dependencies to check
   * @param actions which actions to check for missing dependencies
   * @returns a list of missing dependencies
   */
  checkMissing(actions = this.allActionNames) {
    const missing: { action: string; dependency: string }[] = [];
    for (const n of actions) {
      for (const dep of this.getDependencies(n)) {
        if (_.sortedIndexOf(this.allActionNames, dep) === -1) {
          missing.push({ action: n, dependency: dep });
        }
      }
    }

    return missing;
  }

  /**
   * Determines if the nodes reachable from the given list of actions have any cycles.
   *
   * If any cycles exist, an array of all the nodes involved in the cycle will be returned
   */
  checkCycles(
    actions = this.allActionNames,
    seenNodes = new Set<string>(),
    currentPath = new Set<string>()
  ): string[] | null {
    for (const n of actions) {
      if (seenNodes.has(n)) {
        return null;
      }

      if (currentPath.has(n)) {
        // we have just hit a cycle
        return [n];
      }

      currentPath.add(n);

      const cycle = this.checkCycles(this.computeDependencies(n), seenNodes, currentPath);

      if (cycle) {
        if (this.computeDependencies(cycle[cycle.length - 1]).indexOf(cycle[0]) === -1) {
          cycle.unshift(n);
        }

        return cycle;
      }

      // if we make it this far we know that this node is not involved in a cycle
      currentPath.delete(n);
      seenNodes.add(n);
    }

    return null;
  }

  /**
   * Runs `checkExtraneousdependenciesOnNode` for all actions, effectively checking the whole
   * chain definition for any extraneous dependencies.
   * @note according to wikipidea, this is allegedly the fastest algorithm to verify a transitive reduction
   * @returns list of extraneous dependencies found
   */
  checkExtraneousDependencies() {
    const extraneous = [];

    for (const action of this.topologicalActions) {
      extraneous.push(...this.checkExtraneousDependenciesOnNode(action));
    }

    return extraneous;
  }

  /**
   * Determines if the given node has any extraneous dependencies (that is, a dependency which is also contained in one of its children).
   *
   * If any extraneous dependencies are found, they are returned.
   *
   * @param node the node to start verifying from
   * @returns list of extraneous dependencies found
   */
  checkExtraneousDependenciesOnNode(node: string): { node: string; extraneous: string; inDep: string }[] {
    const deps = this.getDependencies(node);
    const extraneous = [];

    // extraneous dependency is defined as a direct dependency
    // on this node which is also a deeper dependency of another
    // dependency of this node
    for (const dep of deps) {
      for (const d of deps) {
        const [childDeps] = this.getDependencyTree(dep);
        if (childDeps.includes(d)) {
          extraneous.push({ node, extraneous: d, inDep: dep });
        }
      }
    }

    return extraneous;
  }

  getLayerDependencyTree(n: string, layers: StateLayers): string[] {
    const deps = [];

    if (!layers[n]) {
      debug('WARN: layer dependency tree not computable for step because not found:', n);
      return [];
    }

    for (const dep of layers[n].depends) {
      deps.push(...this.getLayerDependencyTree(dep, layers));
    }

    deps.push(...layers[n].actions);

    return deps;
  }

  // on local nodes, steps depending on the same base need to be merged into "layers" to prevent state collisions
  // returns an array of layers which can be deployed as a unit in topological order
  getStateLayers(): StateLayers {
    if (this.cachedLayers) {
      return this.cachedLayers;
    }

    const actions = this.topologicalActions;
    const layers: { [key: string]: { actions: string[]; depends: string[] } } = {};
    const layerOfActions = new Map<string, string>();
    const layerDependingOn = new Map<string, string>();

    debug('start compute state layers', actions);
    for (const n of actions) {
      if (layerOfActions.has(n)) {
        continue;
      }

      const action = _.get(this.raw, n);

      if (!action) {
        throw new Error(`action not found: ${n}`);
      }

      // starts in its own layer
      debug('layer up', n);
      layers[n] = {
        actions: [n],

        // attached to all the layers of the dependencies
        depends: [],
      };

      let attachingLayer: string = n;

      let deps = this.getDependencies(n);
      debug('layer dependencies before', deps);

      // first. filter any deps which are extraneous. This is a dependency which is a subdepenendency of an assigned layer for a dependency.
      // @note this is the slowest part of cannon atm. Improvements here would be most important.
      for (const dep of deps) {
        if (!layers[dep]) {
          debug('WARN: unknown dependency recorded in cannonfile:', dep);
          continue;
        }
        for (const depdep of layers[dep].depends) {
          const depTree = this.getLayerDependencyTree(depdep, layers);
          deps = deps.filter((d) => depTree.indexOf(d) === -1);
        }
      }

      deps = _.sortBy(deps, (d) => -this.cachedActionDepths.get(d)!);
      debug('layer dependencies after', deps);

      for (const dep of deps) {
        // layer is guarenteed to exist here because topological sort
        const depLayer = layerOfActions.get(dep)!;
        let dependingLayer = layerDependingOn.get(depLayer);

        if (dependingLayer && dependingLayer !== attachingLayer) {
          while (layerDependingOn.has(dependingLayer!)) {
            debug(`stepping up dep ${dependingLayer} because its deep already`);
            dependingLayer = layerDependingOn.get(dependingLayer!);
          }
          if (attachingLayer == dependingLayer) {
            // dependency is already handled
            continue;
          }
          // "merge" this entire layer into the other one
          debug(`merge from ${attachingLayer} into layer`, dependingLayer);
          layers[dependingLayer!].actions.push(...layers[attachingLayer].actions);
          layers[dependingLayer!].depends = _.uniq([...layers[dependingLayer!].depends, ...layers[attachingLayer].depends]);

          // ensure the other nodes are now pointing to this structure
          for (const a of layers[attachingLayer].actions) {
            layers[a] = layers[dependingLayer!];
          }

          attachingLayer = dependingLayer!;
        } else if (layers[attachingLayer].depends.indexOf(depLayer) === -1) {
          // "extend" this layer to encapsulate this
          debug(`extend the layer ${attachingLayer} with dep`, depLayer);
          layers[attachingLayer].depends.push(depLayer);
        }
      }

      // ensure layer is set for the node we are on
      layers[n] = layers[attachingLayer];

      for (const n of layers[attachingLayer].actions) {
        layerOfActions.set(n, attachingLayer);
      }

      for (const d of layers[attachingLayer].depends) {
        layerDependingOn.set(d, attachingLayer);
      }

      layers[attachingLayer].actions.sort();
      layers[attachingLayer].depends.sort();
    }

    debug('end compute state layer', actions);

    this.cachedLayers = layers;

    return layers;
  }

  private getPrintLinesUsed(n: string, layers = this.getStateLayers()): number {
    if (!layers[n]) {
      debug('WARN: cannot calculate print lines used for layer becuase undefined:', n);
      return 0;
    }
    return Math.max(
      layers[n].actions.length + 2,
      _.sumBy(layers[n].depends, (d) => this.getPrintLinesUsed(d, layers))
    );
  }

  printPartialTopology(n: string, layers = this.getStateLayers(), line = 0): string {
    const layer = layers[n];

    let output = '';

    // print myself
    const width = _.maxBy(layer.actions, 'length')!.length;
    if (line === 0) {
      output = '┌─' + '─'.repeat(width) + '─┐';
    } else if (line <= layer.actions.length) {
      output = '│ ' + layer.actions[line - 1] + ' '.repeat(width - layer.actions[line - 1].length) + ' │';
    } else if (line === layer.actions.length + 1) {
      output = '└─' + '─'.repeat(width) + '─┘';
    }

    // print the layers we depend on
    if (layer.depends.length) {
      // get current dependency printing info
      let depIndex = 0;
      let depUsedLines = 0;
      for (; depIndex < layer.depends.length; depIndex++) {
        const lineCount = this.getPrintLinesUsed(layer.depends[depIndex], layers);

        if (depUsedLines + lineCount > line) {
          break;
        } else {
          depUsedLines += lineCount;
        }
      }

      if (depIndex < layer.depends.length) {
        if (!output) {
          output += ' '.repeat(width + 4);
        }

        if (line === 0) {
          output += '     ';
        } else if (line === 1) {
          output += layer.depends.length > 1 ? '──┬──' : '─────';
        } else if (line - depUsedLines === 1) {
          output += depIndex < layer.depends.length - 1 ? '  ├──' : '  └──';
        } else if (depIndex < layer.depends.length - 1 || line - depUsedLines < 1) {
          output += '  │  ';
        } else {
          output += '     ';
        }

        output += this.printPartialTopology(layer.depends[depIndex], layers, line - depUsedLines);
      }
    }

    return output;
  }

  /**
   * returns human-readable representation of the dag dependency graph of this chain definition
   * @returns array of lines to print
   */
  printTopology(nodes: string[] = []): string[] {
    const layers = this.getStateLayers();

    if (!nodes.length) {
      // get leaf layers
      const layerArray = _.uniq(Object.values(layers));

      layerSearch: for (const layer of layerArray) {
        for (const action of layer.actions) {
          if (layerArray.find((l) => l.depends.indexOf(action) !== -1)) {
            // this isnt a leaf
            continue layerSearch;
          }
        }

        nodes.push(layer.actions[0]);
      }
    }

    debug('begin print topology', nodes);

    // for each leaf layer, print it until there is empty output
    const completeLines = [];

    for (const n of nodes) {
      const lines = [];
      let line;
      while ((line = this.printPartialTopology(n, layers, lines.length)) !== '') {
        lines.push(line);
      }

      completeLines.push(...lines);
    }

    debug('end print topology', nodes);

    return completeLines;
  }

  toJson(): RawChainDefinition {
    return _.cloneDeep(this.raw);
  }
}
