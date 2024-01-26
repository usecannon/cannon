import _ from 'lodash';
import Debug from 'debug';

import { z } from 'zod';
import { contractSchema } from '../schemas.zod';

import * as viem from 'viem';
import { Address, Hash, Hex } from 'viem';

import {
  ChainBuilderContext,
  ChainBuilderRuntimeInfo,
  ChainArtifacts,
  ChainBuilderContextWithHelpers,
  ContractArtifact,
  PackageState,
} from '../types';
import { computeTemplateAccesses } from '../access-recorder';
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
): [Hex, { [sourceName: string]: { [libName: string]: string } }] {
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
        injectedBytecode = (injectedBytecode.substring(0, 2 + ref.start * 2) +
          libraryAddress.substring(2) +
          injectedBytecode.substring(2 + (ref.start + ref.length) * 2)) as viem.Hex;

        _.set(linkedLibraries, [file, lib], libraryAddress);
      }
    }
  }

  return [injectedBytecode, linkedLibraries];
}

function generateOutputs(
  config: Config,
  ctx: ChainBuilderContext,
  artifactData: ContractArtifact,
  deployTxn: viem.TransactionReceipt | null,
  currentLabel: string
): ChainArtifacts {
  const [injectedBytecode, linkedLibraries] = resolveBytecode(artifactData, config);

  const txn = {
    data: viem.encodeDeployData({
      abi: artifactData.abi,
      bytecode: injectedBytecode,
      args: config.args || [],
    }),
  };

  const [, create2Addr] = makeArachnidCreate2Txn(config.salt || '', txn.data!);

  let abi = artifactData.abi;
  // override abi?
  if (config.abi) {
    if (config.abi.trimStart().startsWith('[')) {
      // Allow to pass in a literal abi string
      abi = JSON.parse(config.abi);
    } else {
      // Load the abi from another contract
      const implContract = getContractDefinitionFromPath(ctx, config.abi);

      if (!implContract) {
        throw new Error(`previously deployed contract with name ${config.abi} for abi not found`);
      }

      abi = implContract.abi;
    }
  } else if (config.abiOf) {
    abi = getMergedAbiFromContractPaths(ctx, config.abiOf);
  }

  return {
    contracts: {
      [currentLabel.split('.')[1] || '']: {
        address: config.create2 ? create2Addr : viem.getAddress(deployTxn!.contractAddress!),
        abi,
        constructorArgs: config.args || [],
        linkedLibraries,
        deployTxnHash: deployTxn?.transactionHash || '',
        sourceName: artifactData.sourceName,
        contractName: artifactData.contractName,
        deployedOn: currentLabel!,
        highlight: config.highlight,
        gasUsed: Number(deployTxn?.gasUsed) || 0,
        gasCost: deployTxn?.effectiveGasPrice.toString() || '0',
      },
    },
  };
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
const contractSpec = {
  label: 'contract',

  validate: contractSchema,

  async getState(runtime: ChainBuilderRuntimeInfo, ctx: ChainBuilderContextWithHelpers, config: Config) {
    const parsedConfig = this.configInject(ctx, config);

    return {
      bytecode: resolveBytecode(await runtime.getArtifact!(parsedConfig.artifact), parsedConfig)[0],
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

  getInputs(config: Config) {
    const accesses: string[] = [];

    accesses.push(...computeTemplateAccesses(config.from));
    accesses.push(...computeTemplateAccesses(config.nonce));
    accesses.push(...computeTemplateAccesses(config.artifact));
    accesses.push(...computeTemplateAccesses(config.value));
    accesses.push(...computeTemplateAccesses(config.abi));
    accesses.push(...computeTemplateAccesses(config.salt));

    if (config.abiOf) {
      config.abiOf.forEach((v) => accesses.push(...computeTemplateAccesses(v)));
    }

    if (config.args) {
      _.forEach(config.args, (a) => accesses.push(...computeTemplateAccesses(JSON.stringify(a))));
    }

    if (config.libraries) {
      _.forEach(config.libraries, (a) => accesses.push(...computeTemplateAccesses(a)));
    }

    if (config?.overrides?.gasLimit) {
      accesses.push(...computeTemplateAccesses(config.overrides.gasLimit));
    }

    return accesses;
  },

  getOutputs(_: Config, packageState: PackageState) {
    return [`contracts.${packageState.currentLabel.split('.')[1]}`];
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
      if ((await runtime.provider.getBytecode({ address: config.libraries![lib] as Address })) === '0x') {
        throw new Error(`library ${lib} has no bytecode. This is most likely a missing dependency or bad state.`);
      }
    }

    const artifactData = await runtime.getArtifact!(config.artifact);

    if (!artifactData) {
      throw new Error(
        `bytecode/abi for artifact ${config.artifact} not found. please double check the contract name and your build configuration`
      );
    }

    const [injectedBytecode] = resolveBytecode(artifactData, config);

    // finally, deploy
    const txn = {
      data: viem.encodeDeployData({
        abi: artifactData.abi,
        bytecode: injectedBytecode,
        args: config.args || [],
      }),
    };

    const overrides: any = {}; // TODO

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

    let receipt: viem.TransactionReceipt | null = null;

    if (config.create2) {
      await ensureArachnidCreate2Exists(runtime);

      debug('performing arachnid create2');
      const [create2Txn, addr] = makeArachnidCreate2Txn(config.salt || '', txn.data!);
      debug('create2 address is', addr);

      if (await runtime.provider.getBytecode({ address: addr })) {
        debug('create2 contract already completed');
        // our work is done for us. unfortunately, its not easy to figure out what the transaction hash was
      } else {
        const signer = config.from
          ? await runtime.getSigner(config.from as viem.Address)
          : await runtime.getDefaultSigner!(txn, config.salt);
        const hash = await signer.wallet.sendTransaction(_.assign(create2Txn, overrides));
        receipt = await runtime.provider.waitForTransactionReceipt({ hash });

        debug('arachnid create2 complete', receipt);
      }
    } else {
      if (
        config.from &&
        config.nonce?.length &&
        parseInt(config.nonce) < (await runtime.provider.getTransactionCount({ address: config.from as Address }))
      ) {
        const contractAddress = viem.getContractAddress({ from: config.from as Address, nonce: BigInt(config.nonce) });

        debug(`contract appears already deployed to address ${contractAddress} (nonce too high)`);

        // check that the contract bytecode that was deployed matches the requested
        const actualBytecode = await runtime.provider.getBytecode({ address: contractAddress });
        // we only check the length because solidity puts non-substantial changes (ex. comments) in bytecode and that
        // shouldn't trigger any significant change. And also this is just kind of a sanity check so just verifying the
        // length hshould be sufficient
        if (!actualBytecode || artifactData.deployedBytecode.length !== actualBytecode.length) {
          debug('bytecode does not match up', artifactData.deployedBytecode, actualBytecode);
          throw new Error(
            `the address at ${config.from!} should have deployed a contract at nonce ${config.nonce!} at address ${contractAddress}, but the bytecode does not match up.`
          );
        }
      } else {
        const signer = config.from
          ? await runtime.getSigner(config.from as viem.Address)
          : await runtime.getDefaultSigner!(txn, config.salt);
        const hash = await signer.wallet.sendTransaction(_.assign(txn, overrides));
        receipt = await runtime.provider.waitForTransactionReceipt({ hash });
      }
    }

    return generateOutputs(config, ctx, artifactData, receipt, packageState.currentLabel);
  },

  async importExisting(
    runtime: ChainBuilderRuntimeInfo,
    ctx: ChainBuilderContext,
    config: Config,
    packageState: PackageState,
    existingKeys: string[]
  ): Promise<ChainArtifacts> {
    if (existingKeys.length != 1) {
      throw new Error(
        'a contract can only be deployed on one transaction, so you can only supply one hash transaction to import'
      );
    }

    const artifactData = await runtime.getArtifact!(config.artifact);

    const txn = await runtime.provider.getTransactionReceipt({ hash: existingKeys[0] as Hash });

    return generateOutputs(config, ctx, artifactData, txn, packageState.currentLabel);
  },
};

export default contractSpec;
