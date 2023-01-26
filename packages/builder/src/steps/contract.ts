import _ from 'lodash';
import Debug from 'debug';
import { JTDDataType } from 'ajv/dist/core';

import { ethers } from 'ethers';

import {
  ChainBuilderContext,
  ChainBuilderRuntimeInfo,
  ChainArtifacts,
  ChainBuilderContextWithHelpers,
  ContractArtifact,
} from '../types';
import { getContractDefinitionFromPath, getMergedAbiFromContractPaths } from '../util';
import { ensureArachnidCreate2Exists, makeArachnidCreate2Txn } from '../create2';

const debug = Debug('cannon:builder:contract');

const config = {
  properties: {
    artifact: { type: 'string' },
  },
  optionalProperties: {
    create2: { type: 'boolean' },
    from: { type: 'string' },
    abi: { type: 'string' },
    abiOf: { elements: { type: 'string' } },
    args: { elements: {} },
    libraries: { values: { type: 'string' } },

    // used to force new copy of a contract (not actually used)
    salt: { type: 'string' },

    value: { type: 'string' },
    overrides: {
      optionalProperties: {
        gasLimit: { type: 'int32' },
        gasPrice: { type: 'string' },
        priorityGasPrice: { type: 'string' },
      },
    },

    depends: { elements: { type: 'string' } },
  },
} as const;

export type Config = JTDDataType<typeof config>;

export interface ContractOutputs {
  abi: string;
  address: string;
  deployTxnHash: string;
}

async function resolveBytecode(artifactData: ContractArtifact, config: Config) {
  let injectedBytecode = artifactData.bytecode;
  for (const file in artifactData.linkReferences) {
    for (const lib in artifactData.linkReferences[file]) {
      // get the lib from the config
      const libraryAddress = _.get(config, `libraries.${lib}`);

      if (!libraryAddress) {
        throw new Error(`library not defined: ${lib}`);
      }

      debug('lib ref', lib, libraryAddress);

      // afterwards, inject link references
      const linkReferences = artifactData.linkReferences[file][lib];

      for (const ref of linkReferences) {
        injectedBytecode =
          injectedBytecode.substring(0, 2 + ref.start * 2) +
          libraryAddress.substring(2) +
          injectedBytecode.substring(2 + (ref.start + ref.length) * 2);
      }
    }
  }

  return injectedBytecode;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
  validate: config,

  async getState(runtime: ChainBuilderRuntimeInfo, ctx: ChainBuilderContextWithHelpers, config: Config) {
    const parsedConfig = this.configInject(ctx, config);

    return {
      bytecode: await resolveBytecode(await runtime.getArtifact!(parsedConfig.artifact), parsedConfig),
      args: parsedConfig.args || [],
      salt: parsedConfig.salt,
      value: parsedConfig.value || [],
    };
  },

  configInject(ctx: ChainBuilderContextWithHelpers, config: Config) {
    config = _.cloneDeep(config);

    config.from = _.template(config.from)(ctx);

    config.artifact = _.template(config.artifact)(ctx);

    config.abi = _.template(config.abi)(ctx);

    if (config.abiOf) {
      config.abiOf = _.map(config.abiOf, (v) => _.template(v)(ctx));
    }

    if (config.args) {
      config.args = _.map(config.args, (a) => {
        // just convert it to a JSON string when. This will allow parsing of complicated nested structures
        return JSON.parse(_.template(JSON.stringify(a))(ctx));
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
    runtime: ChainBuilderRuntimeInfo,
    ctx: ChainBuilderContext,
    config: Config,
    currentLabel: string
  ): Promise<ChainArtifacts> {
    debug('exec', config);

    // sanity check that any connected libraries are bytecoded
    for (const lib in config.libraries || {}) {
      if ((await runtime.provider.getCode(config.libraries![lib])) === '0x') {
        throw new Error(`library ${lib} has no bytecode. This is most likely a missing dependency or bad state.`);
      }
    }

    const artifactData = await runtime.getArtifact!(config.artifact);

    if (!artifactData) {
      throw new Error(
        `bytecode/abi for artifact ${config.artifact} not found. please double check the contract name and your build configuration`
      );
    }

    const injectedBytecode = await resolveBytecode(artifactData, config);

    // finally, deploy
    const factory = new ethers.ContractFactory(artifactData.abi, injectedBytecode);

    const txn = factory.getDeployTransaction(...(config.args || []));

    const signer = config.from ? await runtime.getSigner(config.from) : await runtime.getDefaultSigner!(txn, config.salt);

    let transactionHash: string;
    let contractAddress: string;
    if (config.create2) {
      await ensureArachnidCreate2Exists(runtime);

      debug('performing arachnid create2');
      const [create2Txn, addr] = makeArachnidCreate2Txn(config.salt || '', txn.data!);

      if ((await runtime.provider.getCode(addr)) !== '0x') {
        debug('create2 contract already completed');
        // our work is done for us. unfortunately, its not easy to figure out what the transaction hash was
        transactionHash = '';
      } else {
        const pendingTxn = await signer.sendTransaction(create2Txn);
        const receipt = await pendingTxn.wait();
        transactionHash = pendingTxn.hash;

        debug('arachnid create2 complete', receipt);
      }

      contractAddress = addr;
    } else {
      const txnData = await signer.sendTransaction(txn);
      const receipt = await txnData.wait();
      contractAddress = receipt.contractAddress;
      transactionHash = receipt.transactionHash;
    }

    let abi = artifactData.abi;

    // override abi?
    if (config.abi) {
      const implContract = getContractDefinitionFromPath(ctx, config.abi);

      if (!implContract) {
        throw new Error(`previously deployed contract with name ${config.abi} for abi not found`);
      }

      abi = implContract.abi;
    } else if (config.abiOf) {
      abi = getMergedAbiFromContractPaths(ctx, config.abiOf);
    }

    debug('contract deployed to address', contractAddress);

    return {
      contracts: {
        [currentLabel?.split('.')[1] || '']: {
          address: contractAddress,
          abi,
          constructorArgs: config.args || [],
          deployTxnHash: transactionHash,
          sourceName: artifactData.sourceName,
          contractName: artifactData.contractName,
          deployedOn: currentLabel!,
        },
      },
    };
  },
};
