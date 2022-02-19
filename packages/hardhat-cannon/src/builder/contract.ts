import fs from 'fs-extra';
import path from 'path';

import _ from 'lodash';
import Debug from 'debug';
import { Artifact, HardhatRuntimeEnvironment } from 'hardhat/types';
import { JTDDataType } from 'ajv/dist/core';

import { ChainBuilderContext } from './';
import { ChainDefinitionScriptSchema } from './util';
import { dirname } from 'path/posix';

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

async function loadArtifactFile(
  hre: HardhatRuntimeEnvironment,
  storage: string,
  name: string,
  repositoryBuild: boolean
): Promise<Artifact> {
  let artifactData: Artifact | null = null;

  const artifactFile = path.join(storage, name + '.json');

  // attempt to load artifact from prestored files
  if (repositoryBuild) {
    // attempt to load artifact from hardhat and save the module
    artifactData = await hre.artifacts.readArtifact(name);

    // add this artifact to the cannonfile data
    await fs.ensureDir(dirname(artifactFile));
    await fs.writeFile(artifactFile, JSON.stringify(artifactData));
  } else {
    artifactData = JSON.parse((await fs.readFile(artifactFile)).toString());
  }

  return artifactData!;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
  validate: config,

  async getState(
    hre: HardhatRuntimeEnvironment,
    ctx: ChainBuilderContext,
    config: Config,
    storage: string
  ) {
    const parsedConfig = this.configInject(ctx, config);

    const artifactFile = path.join(storage, config.artifact + '.json');
    return {
      bytecode: (
        await loadArtifactFile(
          hre,
          storage,
          parsedConfig.artifact,
          ctx.repositoryBuild
        )
      ).bytecode,
      config: parsedConfig,
    };
  },

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

  async exec(
    hre: HardhatRuntimeEnvironment,
    config: Config,
    storage: string,
    repositoryBuild: boolean
  ): Promise<Outputs> {
    debug('exec', config);

    const signer = (await hre.ethers.getSigners())[0];

    const artifactData = await loadArtifactFile(
      hre,
      storage,
      config.artifact,
      repositoryBuild
    );

    const factory = new hre.ethers.ContractFactory(
      artifactData!.abi,
      artifactData!.bytecode,
      signer
    );

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
