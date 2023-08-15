import _ from 'lodash';
import Debug from 'debug';

import { z } from 'zod';
import { contractSchema } from '../schemas.zod';

import { ethers } from 'ethers';

import { getContractAddress } from '@ethersproject/address';

import {
  ChainBuilderContext,
  ChainBuilderRuntimeInfo,
  ChainArtifacts,
  ChainBuilderContextWithHelpers,
  ContractArtifact,
  PackageState,
} from '../types';
import { getContractDefinitionFromPath, getMergedAbiFromContractPaths } from '../util';
import { ensureArachnidCreate2Exists, makeArachnidCreate2Txn } from '../create2';

const debug = Debug('cannon:builder:contract');

/**
 *  Available properties for contract step
 *  @public
 *  @group Contract
 */
export type Config = z.infer<typeof contractSchema>;

export interface ContractOutputs {
  abi: string;
  address: string;
  deployTxnHash: string;
}

function resolveBytecode(
  artifactData: ContractArtifact,
  config: Config
): [string, { [sourceName: string]: { [libName: string]: string } }] {
  let injectedBytecode = artifactData.bytecode;
  const linkedLibraries: { [sourceName: string]: { [libName: string]: string } } = {};
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

        _.set(linkedLibraries, [file, lib], libraryAddress);
      }
    }
  }

  return [injectedBytecode, linkedLibraries];
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
export default {
  label: 'contract',

  validate: contractSchema,

  async getState(runtime: ChainBuilderRuntimeInfo, ctx: ChainBuilderContextWithHelpers, config: Config) {
    const parsedConfig = this.configInject(ctx, config);

    return {
      bytecode: (await resolveBytecode(await runtime.getArtifact!(parsedConfig.artifact), parsedConfig))[0],
      args: parsedConfig.args?.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))) || [],
      salt: parsedConfig.salt,
      value: parsedConfig.value || [],
    };
  },

  configInject(ctx: ChainBuilderContextWithHelpers, config: Config) {
    config = _.cloneDeep(config);

    config.from = _.template(config.from)(ctx);

    config.nonce = _.template(config.nonce)(ctx);

    config.artifact = _.template(config.artifact)(ctx);

    config.value = _.template(config.value)(ctx);

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

    if (config?.overrides?.gasLimit) {
      config.overrides.gasLimit = _.template(config.overrides.gasLimit)(ctx);
    }

    return config;
  },

  async exec(
    runtime: ChainBuilderRuntimeInfo,
    ctx: ChainBuilderContext,
    config: Config,
    packageState: PackageState
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

    const [injectedBytecode, linkedLibraries] = await resolveBytecode(artifactData, config);

    // finally, deploy
    const factory = new ethers.ContractFactory(artifactData.abi, injectedBytecode);

    const txn = factory.getDeployTransaction(...(config.args || []));

    let transactionHash: string;
    let contractAddress: string;

    const overrides: ethers.Overrides & { value?: string } = {};

    if (config.overrides?.gasLimit) {
      overrides.gasLimit = config.overrides.gasLimit;
    }

    if (runtime.gasPrice) {
      overrides.gasPrice = runtime.gasPrice;
    }

    if (runtime.gasFee) {
      overrides.maxFeePerGas = runtime.gasFee;
    }

    if (runtime.priorityGasFee) {
      overrides.maxPriorityFeePerGas = runtime.priorityGasFee;
    }

    if (config.create2) {
      await ensureArachnidCreate2Exists(runtime);

      debug('performing arachnid create2');
      const [create2Txn, addr] = makeArachnidCreate2Txn(config.salt || '', txn.data!);
      debug('create2 address is', addr);

      if ((await runtime.provider.getCode(addr)) !== '0x') {
        debug('create2 contract already completed');
        // our work is done for us. unfortunately, its not easy to figure out what the transaction hash was
        transactionHash = '';
      } else {
        const signer = config.from
          ? await runtime.getSigner(config.from)
          : await runtime.getDefaultSigner!(txn, config.salt);
        const pendingTxn = await signer.sendTransaction(_.assign(create2Txn, overrides));
        const receipt = await pendingTxn.wait();
        transactionHash = pendingTxn.hash;

        debug('arachnid create2 complete', receipt);
      }

      contractAddress = addr;
    } else {
      if (
        config.from &&
        config.nonce?.length &&
        parseInt(config.nonce) < (await runtime.provider.getTransactionCount(config.from))
      ) {
        contractAddress = getContractAddress({ from: config.from, nonce: config.nonce });

        debug(`contract appears already deployed to address ${contractAddress} (nonce too high)`);

        // check that the contract bytecode that was deployed matches the requested
        const actualBytecode = await runtime.provider.getCode(contractAddress);
        // we only check the length because solidity puts non-substantial changes (ex. comments) in bytecode and that
        // shouldn't trigger any significant change. And also this is just kind of a sanity check so just verifying the
        // lengt hshould be sufficient
        if (artifactData.deployedBytecode.length !== actualBytecode.length) {
          debug('bytecode does not match up', artifactData.deployedBytecode, actualBytecode);
          throw new Error(
            `the address at ${config.from!} should have deployed a contract at nonce ${config.nonce!} at address ${contractAddress}, but the bytecode does not match up.`
          );
        }

        // unfortunately it is not easy to figure out what the transaction hash was
        transactionHash = '';
      } else {
        const signer = config.from
          ? await runtime.getSigner(config.from)
          : await runtime.getDefaultSigner!(txn, config.salt);
        const txnData = await signer.sendTransaction(_.assign(txn, overrides));
        const receipt = await txnData.wait();
        contractAddress = receipt.contractAddress;
        transactionHash = receipt.transactionHash;
      }
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
        [packageState.currentLabel.split('.')[1] || '']: {
          address: contractAddress,
          abi,
          constructorArgs: config.args || [],
          linkedLibraries,
          deployTxnHash: transactionHash,
          sourceName: artifactData.sourceName,
          contractName: artifactData.contractName,
          deployedOn: packageState.currentLabel!,
        },
      },
    };
  },
};
