import { yellow } from 'chalk';
import Debug from 'debug';
import _ from 'lodash';
import { z } from 'zod';
import pkg from '../../package.json';
import { computeTemplateAccesses, mergeTemplateAccesses } from '../access-recorder';
import { build, createInitialContext, getOutputs } from '../builder';
import { CANNON_CHAIN_ID } from '../constants';
import { ChainDefinition } from '../definition';
import { PackageReference } from '../package-reference';
import { Events } from '../runtime';
import { cloneSchema } from '../schemas';
import { DeploymentState } from '../types';
import { template } from '../utils/template';
import { getContentUrl } from '../ipfs';
import { CannonAction } from '../actions';

const debug = Debug('cannon:builder:clone');

/**
 *  Available properties for clone operation
 *  @public
 *  @group clone
 */
export type Config = z.infer<typeof cloneSchema>;

export interface Outputs {
  [key: string]: string;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
const cloneSpec = {
  label: 'clone',

  validate: cloneSchema,

  async getState() {
    // Always re-run the operation
    return [];
  },

  configInject(ctx, config, packageState) {
    config = _.cloneDeep(config);

    if (config.target && config.targetPreset) {
      throw new Error(`only one of \`target\` and \`targetPreset\` can specified for ${packageState.currentLabel}`);
    }

    const ref = new PackageReference(template(config.source, ctx));

    config.source = ref.fullPackageRef;

    if (config.sourcePreset) {
      config.source = PackageReference.from(ref.name, ref.version, config.sourcePreset).fullPackageRef;
    }

    config.sourcePreset = template(config.sourcePreset || '', ctx);
    config.targetPreset = template(config.targetPreset || '', ctx);
    config.target = template(config.target || '', ctx);

    if (config.var) {
      config.var = _.mapValues(config.var, (v) => {
        return template(v, ctx);
      });
    } else if (config.options) {
      config.options = _.mapValues(config.options, (v) => {
        return template(v, ctx);
      });
    }

    if (config.tags) {
      config.tags = config.tags.map((t: string) => template(t, ctx));
    }

    return config;
  },

  getInputs(config, possibleFields) {
    let accesses = computeTemplateAccesses(config.source);
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.target, possibleFields));
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.sourcePreset, possibleFields));
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.targetPreset, possibleFields));

    if (config.var) {
      _.forEach(config.var, (a) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(a, possibleFields))));
    }

    if (config.options) {
      _.forEach(
        config.options,
        (a) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(a, possibleFields)))
      );
    }

    if (config.tags) {
      _.forEach(
        config.tags,
        (a) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(a, possibleFields)))
      );
    }

    return accesses;
  },

  getOutputs(_, packageState) {
    return [`imports.${packageState.currentLabel.split('.')[1]}`, `${packageState.currentLabel.split('.')[1]}`];
  },

  async exec(runtime, ctx, config, packageState) {
    const importLabel = packageState.currentLabel.split('.')[1] || '';
    debug(`[clone.${importLabel}]`, 'exec', config);

    const targetPreset = config.targetPreset || `with-${packageState.ref?.name || 'unknown'}`;
    const sourcePreset = config.sourcePreset;
    const sourceRef = new PackageReference(config.source);
    const source = sourceRef.fullPackageRef;
    const target = config.target || `${sourceRef.name}:${sourceRef.version}@${targetPreset}`;
    const targetRef = new PackageReference(target);
    const chainId = config.chainId ?? CANNON_CHAIN_ID;

    if (sourceRef.version === 'latest') {
      runtime.emit(
        Events.Notice,
        packageState.currentLabel,
        'To prevent unexpected upgrades, it is strongly recommended to lock the version of the source package by specifying a version in the `source` field.'
      );
    }

    if (!config.target && !config.targetPreset) {
      runtime.emit(
        Events.Notice,
        packageState.currentLabel,
        `Deploying cloned package to default preset ${targetRef.preset}`
      );
    }

    // try to read the chain definition we are going to use
    const deployInfo = await runtime.readDeploy(source, chainId);
    if (!deployInfo) {
      throw new Error(
        `deployment not found: ${source}. please make sure it exists for preset ${
          sourcePreset || sourceRef.preset
        } and network ${chainId}.`
      );
    }

    const importPkgOptions = { ...(deployInfo?.options || {}), ...(config.var || config.options || {}) };

    debug(`[clone.${importLabel}]`, 'cloning package options', importPkgOptions);

    // prior to importing the name, ensure the target names/version fields are set on the definition
    deployInfo.def.name = targetRef.name;
    deployInfo.def.version = targetRef.version;
    deployInfo.def.preset = targetRef.preset;

    const def = new ChainDefinition(deployInfo.def);

    // always treat upstream state as what is used if its available. otherwise, we might have a state from a previous upgrade.
    // if all else fails, we can load from scratch (aka this is first deployment)
    let prevState: DeploymentState = {};
    let prevMiscUrl = null;

    // also do not restore previous state for any network that snapshots--its not possible to restore state snapshots, so we have to rebuild
    if (!runtime.snapshots && ctx.imports[importLabel]?.url) {
      const prevUrl = ctx.imports[importLabel].url!;
      debug(`[clone.${importLabel}]`, `using state from previous deploy: ${prevUrl}`);
      const prevDeployInfo = await runtime.readBlob(prevUrl);
      prevState = prevDeployInfo!.state;
      prevMiscUrl = prevDeployInfo!.miscUrl;
    } else {
      // sanity: there shouldn't already be a build in our way
      // if there is, we need to overwrite it. print out a warning.
      if (await runtime.readDeploy(source, runtime.chainId)) {
        debug(
          `[clone.${importLabel}]`,
          yellow(
            'There is a pre-existing deployment for this preset and chain id. This build will overwrite. Did you mean `import`?'
          )
        );
      }

      debug(`[clone.${importLabel}]`, 'no previous state found, deploying from scratch');
    }

    // TODO: needs npm package from the manifest
    const initialCtx = await createInitialContext(def, deployInfo.meta, runtime.chainId, importPkgOptions, ctx.deployer);

    // use separate runtime to ensure everything is clear
    // we override `getArtifact` to use a simple loader from the upstream misc data to ensure that any contract upgrades are captured as expected
    // but if any other misc changes are generated they will still be preserved through the new separate context misc
    const upstreamMisc = await runtime.readBlob(deployInfo.miscUrl);
    const importRuntime = runtime.derive({
      getArtifact: (n) => {
        return upstreamMisc.artifacts[n];
      },
    });

    let partialDeploy = false;
    importRuntime.on(Events.SkipDeploy, () => {
      partialDeploy = true;
    });

    // need to import the misc data for the imported package
    if (prevMiscUrl) {
      debug(`[clone.${importLabel}]`, 'load misc');
      await importRuntime.restoreMisc(prevMiscUrl);
    }

    debug(`[clone.${importLabel}]`, 'start build');
    // last argument prevents build from re-running preflight checks.
    // This might cause issues if an older version of cannon didnt run all checks properly
    const builtState = await build(importRuntime, def, prevState, initialCtx, true);
    if (importRuntime.isCancelled()) {
      partialDeploy = true;
    }

    debug(`[clone.${importLabel}]`, 'finish build. is partial:', partialDeploy);

    if (!_.isEmpty(prevState) && _.isEqual(builtState, prevState)) {
      debug(
        `[clone.${importLabel}]`,
        'built state is exactly equal to previous state. skip generation of new deploy url',
        importLabel
      );
      return {
        imports: {
          [importLabel]: ctx.imports[importLabel],
        },
      };
    }

    const newMiscUrl = await getContentUrl(importRuntime.misc);

    debug(`[clone.${importLabel}]`, 'new misc:', newMiscUrl);

    // need to save state to IPFS now so we can access it in future builds
    const newSubDeployUrl = await runtime.putDeploy({
      // TODO: add cannon version number?
      generator: `cannon clone ${pkg.version}`,
      timestamp: Math.floor(Date.now() / 1000),
      def: def.toJson(),
      miscUrl: newMiscUrl || '',
      options: importPkgOptions,
      state: builtState,
      meta: deployInfo.meta,
      status: partialDeploy ? 'partial' : 'complete',
      chainId: runtime.chainId,
    });

    const uploadedMiscUrl = await importRuntime.recordMisc();

    if (newMiscUrl && newMiscUrl !== uploadedMiscUrl) {
      throw new Error(`Misc url mismatch: ${newMiscUrl} | ${uploadedMiscUrl}`);
    }

    if (!newSubDeployUrl) {
      debug(`[clone.${importLabel}]`, 'warn: cannot record built state for import nested state');
    } else {
      await runtime.registry.publish(
        [target, ...(config.tags || ['latest']).map((t) => config.source.split(':')[0] + ':' + t)],
        runtime.chainId,
        newSubDeployUrl,
        (await runtime.registry.getMetaUrl(source, chainId)) || ''
      );
    }

    return {
      imports: {
        [importLabel]: {
          url: newSubDeployUrl || '',
          tags: config.tags || ['latest'],
          target: targetRef.fullPackageRef,
          preset: targetRef.preset,
          ...(await getOutputs(importRuntime, def, builtState))!,
        },
      },
    };
  },

  timeout: 3600000,
} satisfies CannonAction<Config>;

export default cloneSpec;
