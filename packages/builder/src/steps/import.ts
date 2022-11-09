import _ from 'lodash';
import fs from 'fs-extra';
import Debug from 'debug';
import { JTDDataType } from 'ajv/dist/core';

import { ChainBuilderContext, ChainBuilderRuntime, ChainArtifacts, DeploymentManifest } from '../types';
import { ChainBuilder } from '../builder';
import { getDeploymentInfoFile, getPackageDir } from '../storage';
import { ChainDefinition } from '../definition';
import { CANNON_CHAIN_ID } from '../constants';
import { DeploymentInfo } from '../types';

const debug = Debug('cannon:builder:import');

const config = {
  properties: {
    source: { type: 'string' },
  },
  optionalProperties: {
    chainId: { type: 'int32' },
    preset: { type: 'string' },
    options: {
      values: { type: 'string' },
    },
    depends: { elements: { type: 'string' } },
  },
} as const;

export type Config = JTDDataType<typeof config>;

export interface Outputs {
  [key: string]: string;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
  validate: config,

  async getState(_runtime: ChainBuilderRuntime, ctx: ChainBuilderContext, config: Config) {
    return this.configInject(ctx, config);
  },

  configInject(ctx: ChainBuilderContext, config: Config) {
    config = _.cloneDeep(config);

    config.source = _.template(config.source)(ctx);
    config.preset = _.template(config.preset)(ctx) || 'main';

    if (config.options) {
      config.options = _.mapValues(config.options, (v) => {
        return _.template(v)(ctx);
      });
    }

    return config;
  },

  async exec(runtime: ChainBuilderRuntime, ctx: ChainBuilderContext, config: Config): Promise<ChainArtifacts> {
    debug('exec', config);

    // download if necessary upstream
    // then provision a builder and build the cannonfile
    const [name, version] = config.source.split(':');

    const file = getDeploymentInfoFile(getPackageDir(runtime.packagesDir, name, version));
    const deployManifest = fs.readJsonSync(file) as DeploymentManifest;

    const preset = config.preset ?? 'main';
    const chainId = (config.chainId ?? runtime.chainId).toString();

    // try to load the chain definition specific to this chain
    // otherwise, load the top level definition
    const deployInfo: DeploymentInfo | null = _.get(deployManifest.deploys, [chainId, preset], null);

    const builder = new ChainBuilder({
      name,
      version,
      def: new ChainDefinition(deployInfo?.def || deployManifest.def),
      writeMode: 'none',

      // unfortunately the read mode can be quite complicated becuase cannon only builds certain files in certain contexts
      // TODO: this needs a work
      readMode:
        runtime.readMode === 'none'
          ? chainId === runtime.chainId.toString() && runtime.chainId === CANNON_CHAIN_ID
            ? 'all'
            : 'metadata'
          : runtime.readMode,

      provider: runtime.provider,
      preset: preset,
      chainId: parseInt(chainId),
      savedPackagesDir: runtime.packagesDir,
      getSigner: runtime.getSigner,
      getDefaultSigner: runtime.getDefaultSigner,
    });

    const importPkgOptions = { ...(deployInfo?.options || {}), ...(config.options || {}) };

    debug('imported package options', importPkgOptions);

    const outputs = await builder.build(importPkgOptions);

    return {
      contracts: outputs.contracts,
      txns: outputs.txns,
      imports: outputs.imports,
    };
  },
};
