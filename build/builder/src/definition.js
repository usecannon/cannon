var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import crypto from 'crypto';
import Debug from 'debug';
import _ from 'lodash';
import contractSpec from './steps/contract';
import importSpec from './steps/import';
import invokeSpec from './steps/invoke';
import keeperSpec from './steps/keeper';
import scriptSpec from './steps/run';
import Ajv from 'ajv/dist/jtd';
const ajv = new Ajv();
const debug = Debug('cannon:builder:definition');
/**
 * All the different types (and their implementations)
 */
export const ActionKinds = {
    contract: contractSpec,
    import: importSpec,
    invoke: invokeSpec,
    keeper: keeperSpec,
    run: scriptSpec,
};
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
};
export const validateChainDefinition = ajv.compile(ChainDefinitionSchema);
export class ChainDefinition {
    constructor(def) {
        /**
         * @note deps returned in topological order
         * @returns all dependencies reachable from the specfied node
         */
        this.getDependencyTree = _.memoize((node) => {
            const deps = this.getDependencies(node);
            const allDeps = [];
            for (const dep of deps) {
                allDeps.push(...this.getDependencyTree(dep));
                allDeps.push(dep);
            }
            return _.uniq(allDeps);
        });
        this.raw = def;
        const actions = [];
        for (const kind in ActionKinds) {
            for (const n in def[kind]) {
                const fn = `${kind}.${n}`;
                actions.push(fn);
                //actions.set(fn, new Set(this.getDependencies(fn)));
            }
        }
        // do some preindexing
        this.allActionNames = _.sortBy(actions, _.identity);
        this.roots = new Set(this.allActionNames.filter((n) => !this.getDependencies(n).length));
        this.leaves = new Set(_.difference(this.allActionNames, _.chain(this.allActionNames)
            .map((n) => this.getDependencies(n))
            .flatten()
            .uniq()
            .value()));
    }
    getName(ctx) {
        return _.template(this.raw.name)(ctx);
    }
    getVersion(ctx) {
        return _.template(this.raw.version)(ctx);
    }
    getConfig(n, ctx) {
        if (_.sortedIndexOf(this.allActionNames, n) === -1) {
            throw new Error(`getConfig step name not found: ${n}`);
        }
        return ActionKinds[n.split('.')[0]].configInject(ctx, _.get(this.raw, n));
    }
    /**
     * Used to determine if a state needs to be re-run or not
     * @param n action name
     * @param ctx context used to generate configuration for the action
     * @returns string representing the current state of the action
     */
    getState(n, runtime, ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const obj = yield ActionKinds[n.split('.')[0]].getState(runtime, ctx, this.getConfig(n, ctx));
            if (!obj) {
                return null;
            }
            else {
                return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');
            }
        });
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
    getRequiredImports(ctx) {
        if (!this.raw.import)
            return [];
        // we have to apply templating here, only to the `source`
        // it would be best if the dep was downloaded when it was discovered to be needed, but there is not a lot we
        // can do about this right now
        return _.uniq(Object.values(this.raw.import).map((d) => ({
            source: _.template(d.source)(ctx),
            chainId: d.chainId || ctx.chainId,
            preset: _.template(d.preset || 'main')(ctx),
        })));
    }
    /**
     * Get direct dependencies for a given node
     * @param node action to get dependencies for
     * @returns direct dependencies for the specified node
     */
    getDependencies(node) {
        return (_.get(this.raw, node).depends || []);
    }
    get topologicalActions() {
        const actions = [];
        for (const leaf of this.leaves) {
            actions.push(...this.getDependencyTree(leaf), leaf);
        }
        return _.uniq(actions);
    }
    checkAll() {
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
        const missing = [];
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
    checkCycles(actions = this.allActionNames, seenNodes = new Set(), currentPath = new Set()) {
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
    checkExtraneousDependenciesOnNode(node) {
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
    getLayerDependencyTree(n, layers) {
        const deps = [];
        for (const dep of layers[n].depends) {
            deps.push(...this.getLayerDependencyTree(dep, layers));
        }
        deps.push(...layers[n].actions);
        return deps;
    }
    // on local nodes, steps depending on the same base need to be merged into "layers" to prevent state collisions
    // returns an array of layers which can be deployed as a unit in topological order
    getStateLayers(actions = this.topologicalActions, layers = {}, layerOfActions = new Map(), layerDependingOn = new Map()) {
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
                // depending layers are not attached to anything
                depending: [],
            };
            let attachingLayer = n;
            let deps = this.getDependencies(n);
            // first. filter any deps which are extraneous. This is a dependency which is a subdepenendency of an assigned layer for a dependency.
            // @note this is the slowest part of cannon atm. Improvements here would be most important.
            for (const dep of deps) {
                for (const depdep of layers[dep].depends) {
                    const depTree = this.getLayerDependencyTree(depdep, layers);
                    deps = deps.filter((d) => depTree.indexOf(d) === -1);
                }
            }
            for (const dep of deps) {
                // layer is guarenteed to exist here because topological sort
                const depLayer = layerOfActions.get(dep);
                const dependingLayer = layerDependingOn.get(depLayer);
                if (dependingLayer && dependingLayer !== attachingLayer) {
                    // "merge" this entire layer into the other one
                    debug(`merge from ${attachingLayer} into layer`, dependingLayer);
                    layers[dependingLayer].actions.push(...layers[attachingLayer].actions);
                    layers[dependingLayer].depends = _.uniq([...layers[dependingLayer].depends, ...layers[attachingLayer].depends]);
                    attachingLayer = dependingLayer;
                }
                else if (layers[attachingLayer].depends.indexOf(depLayer) === -1) {
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
        return layers;
    }
    getPrintLinesUsed(n, layers = this.getStateLayers()) {
        return Math.max(layers[n].actions.length + 2, _.sumBy(layers[n].depends, (d) => this.getPrintLinesUsed(d, layers)));
    }
    printPartialTopology(n, layers = this.getStateLayers(), line = 0) {
        const layer = layers[n];
        let output = '';
        // print myself
        const width = _.maxBy(layer.actions, 'length').length;
        if (line === 0) {
            output = '┌─' + '─'.repeat(width) + '─┐';
        }
        else if (line <= layer.actions.length) {
            output = '│ ' + layer.actions[line - 1] + ' '.repeat(width - layer.actions[line - 1].length) + ' │';
        }
        else if (line === layer.actions.length + 1) {
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
                }
                else {
                    depUsedLines += lineCount;
                }
            }
            if (depIndex < layer.depends.length) {
                if (!output) {
                    output += ' '.repeat(width + 4);
                }
                if (line === 0) {
                    output += '     ';
                }
                else if (line === 1) {
                    output += layer.depends.length > 1 ? '──┬──' : '─────';
                }
                else if (line - depUsedLines === 1) {
                    output += depIndex < layer.depends.length - 1 ? '  ├──' : '  └──';
                }
                else if (depIndex < layer.depends.length - 1 || line - depUsedLines < 1) {
                    output += '  │  ';
                }
                else {
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
    printTopology(nodes = []) {
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
    toJson() {
        return _.cloneDeep(this.raw);
    }
}
