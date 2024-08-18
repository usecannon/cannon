import Debug from 'debug';
import _ from 'lodash';
import { z } from 'zod';
import { computeTemplateAccesses, mergeTemplateAccesses } from '../access-recorder';
import { getOutputs } from '../builder';
import { ChainDefinition } from '../definition';
import { PackageReference } from '../package-reference';
import { ChainBuilderRuntime } from '../runtime';
import { pullSchema } from '../schemas';
import { ChainArtifacts, ChainBuilderContext, ChainBuilderContextWithHelpers, PackageState } from '../types';
import { template } from '../utils/template';

const debug = Debug('cannon:builder:pull');

/**
 *  Available properties for pull operation
 *  @public
 *  @group pull
 */
export type Config = z.infer<typeof pullSchema>;

export interface Outputs {
  [key: string]: string;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
const pullSpec = {
  label: 'pull',

  validate: pullSchema,

  async getState(runtime: ChainBuilderRuntime, ctx: ChainBuilderContextWithHelpers, config: Config) {
    const cfg = this.configInject(ctx, config);

    const source = cfg.source;
    const chainId = cfg.chainId ?? runtime.chainId;

    debug('resolved pkg', source, chainId);
    const url = await runtime.registry.getUrl(source, chainId);

    return [
      {
        url,
      },
    ];
  },

  configInject(ctx: ChainBuilderContextWithHelpers, config: Config) {
    config = _.cloneDeep(config);

    const packageRef = new PackageReference(template(config.source)(ctx));

    config.source = packageRef.fullPackageRef;
    config.preset = template(config.preset)(ctx) || packageRef.preset;

    return config;
  },

  getInputs(config: Config, possibleFields: string[]) {
    let accesses = computeTemplateAccesses(config.source, possibleFields);
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.preset, possibleFields));

    return accesses;
  },

  getOutputs(_: Config, packageState: PackageState) {
    return [`imports.${packageState.currentLabel.split('.')[1]}`, `${packageState.currentLabel.split('.')[1]}`];
  },

  async exec(
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    config: Config,
    packageState: PackageState
  ): Promise<ChainArtifacts> {
    const importLabel = packageState.currentLabel?.split('.')[1] || '';
    debug('exec', config);

    const source = config.source;
    const preset = config.preset;
    const chainId = config.chainId ?? runtime.chainId;

    // try to load the chain definition specific to this chain
    // otherwise, load the top level definition
    const deployInfo = await runtime.readDeploy(source, chainId);

    if (!deployInfo) {
      throw new Error(
        `deployment not found: ${source}. please make sure it exists for the cannon network and ${preset} preset.`
      );
    }

    if (deployInfo.status === 'partial') {
      throw new Error(
        `deployment status is incomplete for ${source}. cannot generate artifacts safely. please complete deployment to continue import.`
      );
    }

    return {
      imports: {
        [importLabel]: {
          url: (await runtime.registry.getUrl(source, chainId))!, // todo: duplication
          ...(await getOutputs(runtime, new ChainDefinition(deployInfo.def), deployInfo.state))!,
        },
      },
    };
  },
};

export default pullSpec;
