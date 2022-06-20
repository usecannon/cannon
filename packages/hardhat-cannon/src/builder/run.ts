import _ from 'lodash';
import Debug from 'debug';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { JTDDataType } from 'ajv/dist/core';
import { dirname, join } from 'path';

import { ChainBuilderContext, InternalOutputs } from './types';
import { hashDirectory } from './util';

const debug = Debug('cannon:builder:run');

const config = {
  properties: {
    exec: { type: 'string' },
    func: { type: 'string' },
    modified: { elements: { type: 'string' } },
  },
  optionalProperties: {
    args: { elements: { type: 'string' } },
    env: { elements: { type: 'string' } },
    step: { type: 'int32' },
  },
} as const;

export type Config = JTDDataType<typeof config>;

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
  validate: config,

  async getState(
    _: HardhatRuntimeEnvironment,
    ctx: ChainBuilderContext,
    config: Config,
    storage: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    if (!ctx.repositoryBuild) {
      return null; // skip consistency check
      // todo: might want to do consistency check for config but not files, will see
    }

    const newConfig = this.configInject(ctx, config);

    const auxHashes = newConfig.modified.map((pathToScan) => {
      return hashDirectory(pathToScan).toString('hex');
    });

    return {
      auxHashes,
      config: newConfig,
    };
  },

  configInject(ctx: ChainBuilderContext, config: Config) {
    config = _.cloneDeep(config);

    config.exec = _.template(config.exec)(ctx);

    config.modified = _.map(config.modified, (v) => {
      return _.template(v)(ctx);
    });

    if (config.args) {
      config.args = _.map(config.args, (v) => {
        return _.template(v)(ctx);
      });
    }

    if (config.env) {
      config.env = _.map(config.env, (v) => {
        return _.template(v)(ctx);
      });
    }

    return config;
  },

  async exec(hre: HardhatRuntimeEnvironment, _ctx: ChainBuilderContext, config: Config): Promise<InternalOutputs> {
    debug('exec', config);

    const runfile = await import(join(dirname(hre.config.paths.configFile), config.exec));

    const outputs = await runfile[config.func](...(config.args || []));

    if (!outputs.contracts) {
      throw new Error(
        'contracts not returned from script. Please supply any deployed contract in contracts property of returned json. If no contracts were deployed, return an empty object.'
      );
    }

    return outputs;
  },
};
