import Debug from 'debug';
import _ from 'lodash';
import * as viem from 'viem';
import { z } from 'zod';
import { computeTemplateAccesses, mergeTemplateAccesses } from '../access-recorder';
import { ARACHNID_DEFAULT_DEPLOY_ADDR, ensureArachnidCreate2Exists, makeArachnidCreate2Txn } from '../create2';
import { handleTxnError } from '../error';
import { deploySchema } from '../schemas';
import {
  ChainArtifacts,
  ChainBuilderContext,
  ChainBuilderContextWithHelpers,
  ChainBuilderRuntimeInfo,
  ContractArtifact,
  PackageState,
} from '../types';
import { encodeDeployData, getContractDefinitionFromPath, getMergedAbiFromContractPaths } from '../util';
import { template } from '../utils/template';

const debug = Debug('cannon:builder:contract');

/**
 *  Available properties for contract operation
 *  @public
 *  @group Contract
 */
export type Config = z.infer<typeof deploySchema>;

export interface ContractOutputs {
  abi: string;
  address: string;
  deployTxnHash: string;
}

function resolveBytecode(
  artifactData: ContractArtifact,
  config: Config
): [viem.Hex, { [sourceName: string]: { [libName: string]: string } }] {
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
  deployTxnBlock: viem.Block | null,
  deployAddress: viem.Address,
  currentLabel: string
): ChainArtifacts {
  const [, linkedLibraries] = resolveBytecode(artifactData, config);

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
        address: viem.getAddress(deployAddress),
        abi,
        constructorArgs: config.args || [],
        linkedLibraries,
        deployTxnHash: deployTxn?.transactionHash || '',
        deployTxnBlockNumber: deployTxn?.blockNumber.toString() || '',
        deployTimestamp: deployTxnBlock?.timestamp.toString() || '',
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
const deploySpec = {
  label: 'deploy',

  validate: _.cloneDeep(deploySchema),

  async getState(runtime: ChainBuilderRuntimeInfo, ctx: ChainBuilderContextWithHelpers, config: Config) {
    const parsedConfig = this.configInject(ctx, config);

    return [
      {
        bytecode: resolveBytecode(await runtime.getArtifact!(parsedConfig.artifact), parsedConfig)[0],
        args: parsedConfig.args?.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))) || [],
        salt: parsedConfig.salt,
        value: parsedConfig.value || [],
      },
    ];
  },

  configInject(ctx: ChainBuilderContextWithHelpers, config: Config) {
    config = _.cloneDeep(config);

    config.from = template(config.from || '')(ctx);

    config.nonce = template(config.nonce || '')(ctx);

    config.artifact = template(config.artifact)(ctx);

    config.value = template(config.value || '')(ctx);

    config.abi = template(config.abi || '')(ctx);

    if (config.abiOf) {
      config.abiOf = _.map(config.abiOf, (v) => template(v)(ctx));
    }

    if (config.args) {
      config.args = _.map(config.args, (a) => {
        // just convert it to a JSON string when. This will allow parsing of complicated nested structures
        return JSON.parse(template(JSON.stringify(a))(ctx));
      });
    }

    if (config.libraries) {
      config.libraries = _.mapValues(config.libraries, (a) => {
        return template(a)(ctx);
      });
    }

    if (config.salt) {
      config.salt = template(config.salt)(ctx);
    }

    if (config?.overrides?.gasLimit) {
      config.overrides.gasLimit = template(config.overrides.gasLimit)(ctx);
    }

    return config;
  },

  getInputs(config: Config, possibleFields: string[]) {
    let accesses = computeTemplateAccesses(config.from);
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.nonce, possibleFields));
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.artifact, possibleFields));
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.value, possibleFields));
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.abi, possibleFields));
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.salt, possibleFields));

    if (config.abiOf) {
      _.forEach(
        config.abiOf,
        (v) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(v, possibleFields)))
      );
    }

    if (config.args) {
      _.forEach(
        config.args,
        (v) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(JSON.stringify(v), possibleFields)))
      );
    }

    if (config.libraries) {
      _.forEach(
        config.libraries,
        (v) => (accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(v, possibleFields)))
      );
    }

    if (config?.overrides?.gasLimit) {
      accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.overrides.gasLimit, possibleFields));
    }

    return accesses;
  },

  getOutputs(_: Config, packageState: PackageState) {
    return [`contracts.${packageState.currentLabel.split('.')[1]}`, `${packageState.currentLabel.split('.')[1]}`];
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
      if ((await runtime.provider.getBytecode({ address: config.libraries![lib] as viem.Address })) === '0x') {
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
      data: encodeDeployData({
        abi: artifactData.abi,
        bytecode: injectedBytecode,
        args: config.args || [],
      }),
    };

    const overrides: any = {};

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
    let deployAddress: viem.Address;

    try {
      if (config.create2) {
        const arachnidDeployerAddress = await ensureArachnidCreate2Exists(
          runtime,
          typeof config.create2 === 'string' ? (config.create2 as viem.Address) : ARACHNID_DEFAULT_DEPLOY_ADDR
        );

        debug('performing arachnid create2');
        const [create2Txn, addr] = makeArachnidCreate2Txn(config.salt || '', txn.data!, arachnidDeployerAddress);
        debug(`create2: deploy ${addr} by ${arachnidDeployerAddress}`);

        const bytecode = await runtime.provider.getBytecode({ address: addr });

        if (bytecode && bytecode !== '0x') {
          debug('create2 contract already completed');
          // our work is done for us. unfortunately, its not easy to figure out what the transaction hash was
        } else {
          const signer = config.from
            ? await runtime.getSigner(config.from as viem.Address)
            : await runtime.getDefaultSigner!(txn, config.salt);

          const fullCreate2Txn = _.assign(create2Txn, overrides, { account: signer.wallet.account || signer.address });
          debug('final create2 txn', fullCreate2Txn);

          const preparedTxn = await runtime.provider.prepareTransactionRequest(fullCreate2Txn);
          const hash = await signer.wallet.sendTransaction(preparedTxn as any);
          receipt = await runtime.provider.waitForTransactionReceipt({ hash });
          debug('arachnid create2 complete', receipt);
        }
        deployAddress = addr;
      } else {
        const curAccountNonce = config.from
          ? await runtime.provider.getTransactionCount({ address: config.from as viem.Address })
          : 0;
        if (config.from && config.nonce?.length && parseInt(config.nonce) < curAccountNonce) {
          const contractAddress = viem.getContractAddress({
            from: config.from as viem.Address,
            nonce: BigInt(config.nonce),
          });

          debug(`contract appears already deployed to address ${contractAddress} (nonce too high)`);

          // check that the contract bytecode that was deployed matches the requested
          const actualBytecode = await runtime.provider.getBytecode({ address: contractAddress });
          // we only check the length because solidity puts non-substantial changes (ex. comments) in bytecode and that
          // shouldn't trigger any significant change. And also this is just kind of a sanity check so just verifying the
          // length should be sufficient
          if (!actualBytecode || artifactData.deployedBytecode.length !== actualBytecode.length) {
            debug('bytecode does not match up', artifactData.deployedBytecode, actualBytecode);
            // this can happen normally. for now lets just disable it for now
            /*throw new Error(
            `the address at ${config.from!} should have deployed a contract at nonce ${config.nonce!} at address ${contractAddress}, but the bytecode does not match up. actual bytecode length: ${
              (actualBytecode || '').length
            }`
          );*/
          }

          deployAddress = contractAddress;
        } else {
          const signer = config.from
            ? await runtime.getSigner(config.from as viem.Address)
            : await runtime.getDefaultSigner!(txn, config.salt);

          if (config.overrides?.simulate) {
            // if the code goes here, it means that the Create2 deployment failed
            // and prepareTransactionRequest will throw an error with the underlying revert message
            await runtime.provider.prepareTransactionRequest(
              _.assign(txn, overrides, { account: signer.wallet.account || signer.address })
            );

            deployAddress = viem.zeroAddress;
          } else {
            const preparedTxn = await runtime.provider.prepareTransactionRequest(
              _.assign(txn, overrides, { account: signer.wallet.account || signer.address })
            );

            const hash = await signer.wallet.sendTransaction(preparedTxn as any);
            receipt = await runtime.provider.waitForTransactionReceipt({ hash });
            deployAddress = receipt.contractAddress!;
          }
        }
      }
    } catch (error: any) {
      // catch an error when it comes from create2 deployer
      if (config.create2) {
        // arachnid create2 does not return the underlying revert message.
        // ref: https://github.com/Arachnid/deterministic-deployment-proxy/blob/master/source/deterministic-deployment-proxy.yul#L13

        // simulate a non-create2 deployment to get the underlying revert message
        const simulateConfig = {
          ...config,
          create2: false,
          overrides: {
            ...config.overrides,
            simulate: true,
          },
        };

        return await this.exec(runtime, ctx, simulateConfig, packageState);
      } else {
        // catch an error when it comes from normal deployment
        const contractArtifact = generateOutputs(
          config,
          ctx,
          artifactData,
          receipt,
          null,
          // note: send zero address since there is no contract address
          viem.zeroAddress,
          packageState.currentLabel
        );

        return await handleTxnError(contractArtifact, runtime.provider, error);
      }
    }

    const block = await runtime.provider.getBlock({ blockNumber: receipt?.blockNumber });

    return generateOutputs(config, ctx, artifactData, receipt, block, deployAddress, packageState.currentLabel);
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

    const txn = await runtime.provider.getTransactionReceipt({ hash: existingKeys[0] as viem.Hash });

    if (!txn.contractAddress) {
      throw new Error('imported txn does not appear to deploy a contract');
    }

    const block = await runtime.provider.getBlock({ blockNumber: txn?.blockNumber });

    return generateOutputs(config, ctx, artifactData, txn, block, txn.contractAddress!, packageState.currentLabel);
  },
};

export default deploySpec;
