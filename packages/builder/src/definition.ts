import crypto from 'crypto';

import _ from 'lodash';
import { ChainBuilderContext } from './types';

import contractSpec from './steps/contract';
import importSpec from './steps/import';
import invokeSpec from './steps/invoke';
import keeperSpec from './steps/keeper';
import scriptSpec from './steps/run';
import { ChainBuilderRuntime } from './types';

import Ajv from 'ajv/dist/jtd';
import { JTDDataType } from 'ajv/dist/core';

const ajv = new Ajv();

/**
 * All the different types (and their implementations)
 */
export const ActionKinds = {
  contract: contractSpec,
  import: importSpec,
  invoke: invokeSpec,
  keeper: keeperSpec,
  run: scriptSpec,
} as const;

const ChainDefinitionSchema = {
  properties: {
    name: { type: 'string' },
    version: { type: 'string' },
  },
  optionalProperties: {
    description: { type: 'string' },
    keywords: { elements: { type: 'string' } },
    setting: {
      values: {
        optionalProperties: {
          description: { type: 'string' },
          type: { enum: ['number', 'string', 'boolean'] },
          defaultValue: { type: 'string' },
        },
      },
    },
    import: { values: importSpec.validate },
    contract: { values: contractSpec.validate },
    invoke: { values: invokeSpec.validate },
    run: { values: scriptSpec.validate },
    keeper: { values: keeperSpec.validate },
  },
} as const;

export type RawChainDefinition = JTDDataType<typeof ChainDefinitionSchema>;

export const validateChainDefinition = ajv.compile(ChainDefinitionSchema);

export type ChainDefinitionProblems = {
  invalidSchema: any;
  missing: { action: string; dependency: string }[];
  cycles: string[][];
  extraneous: { node: string; extraneous: string; inDep: string }[];
};

export class ChainDefinition {
  private raw: RawChainDefinition;

  readonly allActionNames: string[];

  // actions which have no dependencies
  readonly roots: Set<string>;

  // actions which are not depended on by anything
  readonly leaves: Set<string>;

  constructor(def: RawChainDefinition) {
    this.raw = def;

    const actions = [];
    for (const kind in ActionKinds) {
      for (const n in def[kind as keyof typeof ActionKinds]) {
        const fn = `${kind}.${n}`;
        actions.push(fn);
        //actions.set(fn, new Set(this.getDependencies(fn)));
      }
    }

    // do some preindexing
    this.allActionNames = _.sortBy(actions, _.identity);

    this.roots = new Set(this.allActionNames.filter((n) => !this.getDependencies(n).length));

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
  }

  getName(ctx: ChainBuilderContext) {
    return _.template(this.raw.name)(ctx);
  }

  getVersion(ctx: ChainBuilderContext) {
    return _.template(this.raw.version)(ctx);
  }

  getConfig(n: string, ctx: ChainBuilderContext) {
    if (_.sortedIndexOf(this.allActionNames, n) === -1) {
      throw new Error(`getConfig step name not found: ${n}`);
    }

    return ActionKinds[n.split('.')[0] as keyof typeof ActionKinds].configInject(ctx, _.get(this.raw, n))!;
  }

  /**
   * Used to determine if a state needs to be re-run or not
   * @param n action name
   * @param ctx context used to generate configuration for the action
   * @returns string representing the current state of the action
   */
  async getState(n: string, runtime: ChainBuilderRuntime, ctx: ChainBuilderContext): Promise<string | null> {
    const obj = await ActionKinds[n.split('.')[0] as keyof typeof ActionKinds].getState(
      runtime,
      ctx,
      this.getConfig(n, ctx) as any
    );

    if (!obj) {
      return null;
    } else {
      return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');
    }
  }

  /**
   * Gets the `setting` field in the raw chain definition
   * @returns definition of settings
   */
  getSettings() {
    return this.raw.setting;
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
  getDependencies(node: string) {
    return (_.get(this.raw, node)!.depends || []) as string[];
  }

  /**
   * @note deps returned in topological order
   * @returns all dependencies reachable from the specfied node
   */
  getDependencyTree: (node: string) => string[] = _.memoize((node) => {
    const deps = this.getDependencies(node);

    const allDeps = [];

    for (const dep of deps) {
      allDeps.push(...this.getDependencyTree(dep));
      allDeps.push(dep);
    }

    return _.uniq(allDeps);
  });

  get topologicalActions() {
    const actions = [];

    for (const leaf of this.leaves) {
      actions.push(...this.getDependencyTree(leaf), leaf);
    }

    return _.uniq(actions);
  }

  checkAll(): ChainDefinitionProblems | null {
    const invalidSchema = validateChainDefinition(this.raw);

    const missing = this.checkMissing();
    const cycle = missing.length ? [] : this.checkCycles();
    const extraneous = cycle ? [] : this.checkExtraneousDependencies();

    if (!missing.length && !cycle && !extraneous.length) {
      return null;
    }

    return {
      invalidSchema,
      missing,
      cycles: cycle ? [cycle] : [],
      extraneous,
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

      const cycle = this.checkCycles(this.getDependencies(n), seenNodes, currentPath);

      if (cycle) {
        if (this.getDependencies(cycle[cycle.length - 1]).indexOf(cycle[0]) === -1) {
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
    outer: for (const dep of deps) {
      for (const d of deps) {
        const childDeps = new Set(this.getDependencyTree(dep));
        if (childDeps.has(d)) {
          extraneous.push({ node, extraneous: d, inDep: dep });
          break outer;
        }
      }
    }

    return extraneous;
  }

  // on local nodes, steps depending on the same base need to be merged into "layers" to prevent state collisions
  // returns an array of layers which can be deployed as a unit in topological order
  getStateLayers(
    actions = this.allActionNames,
    layers: { [key: string]: { actions: string[]; depends: string[]; depending: string[] } } = {},
    layerOfActions = new Map<string, string>(),
    layerDependingOn = new Map<string, string>()
  ): { [key: string]: { actions: string[]; depends: string[]; depending: string[] } } {
    for (const n of actions) {
      if (layerOfActions.has(n)) {
        continue;
      }

      const action = _.get(this.raw, n);

      if (!action) {
        throw new Error(`action not found: ${n}`);
      }

      // starts in its own layer
      layers[n] = {
        actions: [n],

        // attached to all the layers of the dependencies
        depends: [],

        // depending layers are not attached to anything
        depending: [],
      };

      let attachingLayer: string = n;

      for (const dep of this.getDependencies(n)) {
        if (!layerOfActions.has(dep)) {
          this.getStateLayers([dep], layers, layerOfActions);
        }

        const depLayer = layerOfActions.get(dep)!;
        const dependingLayer = layerDependingOn.get(depLayer);

        if (dependingLayer) {
          // "merge" this entire layer into the other one
          layers[dependingLayer].actions.push(...layers[attachingLayer].actions);
          layers[dependingLayer].depends = _.uniq([...layers[dependingLayer].depends, ...layers[attachingLayer].depends]);

          attachingLayer = dependingLayer;
        } else if (layers[attachingLayer].depends.indexOf(depLayer) === -1) {
          // "extend" this layer to encapsulate this
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
    }

    return layers;
  }

  /**
   * returns human-readable representation of the dag dependency graph of this chain definition
   * @returns array of lines to print
   */
  printTopology(): string[] {
    return [];
  }

  toJson(): RawChainDefinition {
    return _.cloneDeep(this.raw);
  }
}
