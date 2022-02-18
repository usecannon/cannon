import _ from 'lodash';
import Debug from 'debug';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { JTDDataType } from 'ajv/dist/core';

import { ChainBuilderContext } from './';
import { ChainDefinitionScriptSchema } from './util';

const debug = Debug('cannon:builder:contract');

const config = {
  properties: {
    artifact: { type: 'string' },
  },
  optionalProperties: {
    args: { elements: {} },
    detect: {
      discriminator: 'method',
      mapping: {
        folder: { properties: { path: { type: 'string' } } },
        script: ChainDefinitionScriptSchema,
      },
    },
    step: { type: 'int32' },

    // used to force new copy of a contract (not actually used)
    salt: { type: 'string' },
  },
} as const;

export type Config = JTDDataType<typeof config>;

export interface Outputs {
  abi: string;
  address: string;
  deployTxnHash: string;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
  validate: config,

  configInject(ctx: ChainBuilderContext, config: Config) {
    config = _.cloneDeep(config);

    config.artifact = _.template(config.artifact)(ctx);

    if (config.args) {
      config.args = config.args.map((a) => {
        return typeof a == 'string' ? _.template(a)(ctx) : a;
      });
    }

    if (config.salt) {
      config.salt = _.template(config.salt)(ctx);
    }

    return config;
  },

  async exec(hre: HardhatRuntimeEnvironment, config: Config): Promise<Outputs> {
    debug('exec', config);

    const factory = await hre.ethers.getContractFactory(config.artifact);

    const deployed = await factory.deploy(...(config.args || []));

    return {
      abi: factory.interface.format(
        hre.ethers.utils.FormatTypes.json
      ) as string,
      address: deployed.address,
      deployTxnHash: deployed.deployTransaction.hash,
    };
  },
};
