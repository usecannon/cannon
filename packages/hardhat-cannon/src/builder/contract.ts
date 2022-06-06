import _ from 'lodash';
import Debug from 'debug';
import fs from 'fs-extra';
import path from 'path';
import { Artifact, HardhatRuntimeEnvironment } from 'hardhat/types';
import { JTDDataType } from 'ajv/dist/core';
import { dirname } from 'path';

import { ChainBuilderContext, InternalOutputs } from './types';
import { getExecutionSigner } from './util';

const debug = Debug('cannon:builder:contract');

const config = {
  properties: {
    artifact: { type: 'string' },
  },
  optionalProperties: {
    args: { elements: {} },
    libraries: { values: { type: 'string' } },
    step: { type: 'int32' },

    // used to force new copy of a contract (not actually used)
    salt: { type: 'string' },
  },
} as const;

export type Config = JTDDataType<typeof config>;

export interface ContractOutputs {
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

    return artifactData;
  } else {
    const artifactContent = await fs.readFile(artifactFile);
    artifactData = JSON.parse(artifactContent.toString());

    if (!artifactData) {
      throw new Error(`Invalid artifact for "${name}"`);
    }

    return artifactData;
  }
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
  validate: config,

  async getState(hre: HardhatRuntimeEnvironment, ctx: ChainBuilderContext, config: Config, storage: string) {
    const parsedConfig = this.configInject(ctx, config);

    return {
      bytecode: (await loadArtifactFile(hre, storage, parsedConfig.artifact, ctx.repositoryBuild)).bytecode,
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

    if (config.libraries) {
      config.libraries = _.mapValues(config.libraries, (a) => {
        return _.template(a)(ctx);
      });
    }

    if (config.salt) {
      config.salt = _.template(config.salt)(ctx);
    }

    return config;
  },

  async exec(
    hre: HardhatRuntimeEnvironment,
    ctx: ChainBuilderContext,
    config: Config,
    storage: string,
    selfLabel: string
  ): Promise<InternalOutputs> {
    debug('exec', config);

    const artifactData = await loadArtifactFile(hre, storage, config.artifact, ctx.repositoryBuild);

    let injectedBytecode = artifactData.bytecode;
    for (const file in artifactData.linkReferences) {
      for (const lib in artifactData.linkReferences[file]) {
        // get the lib from the config
        const libraryAddress = _.get(config, `libraries.${lib}`);

        if (!libraryAddress) {
          throw new Error(`library for contract ${config.artifact} not defined: ${lib}`);
        }

        debug('lib ref', lib, libraryAddress);

        // afterwards, inject link references
        const linkReferences = artifactData.linkReferences[file][lib];

        for (const ref of linkReferences) {
          injectedBytecode =
            injectedBytecode.substr(0, 2 + ref.start * 2) +
            libraryAddress.substr(2) +
            injectedBytecode.substr(2 + (ref.start + ref.length) * 2);
        }
      }
    }

    // finally, deploy
    const factory = new hre.ethers.ContractFactory(artifactData.abi, injectedBytecode);

    const txn = factory.getDeployTransaction(...(config.args || []));

    const signer = await getExecutionSigner(
      hre,
      txn.data + Buffer.from(config.salt || '', 'utf8').toString('hex'),
      ctx.fork
    );

    const txnData = await signer.sendTransaction(txn);

    const receipt = await txnData.wait();

    return {
      contracts: {
        [selfLabel]: {
          address: receipt.contractAddress,
          abi: JSON.parse(factory.interface.format(hre.ethers.utils.FormatTypes.json) as string),
          constructorArgs: config.args || [],
          deployTxnHash: receipt.transactionHash,
        },
      },
    };
  },
};
