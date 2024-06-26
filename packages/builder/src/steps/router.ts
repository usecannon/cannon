import Debug from 'debug';
import _ from 'lodash';
import * as viem from 'viem';
import { z } from 'zod';
import { computeTemplateAccesses, mergeTemplateAccesses } from '../access-recorder';
import { ChainBuilderRuntime } from '../runtime';
import { routerSchema } from '../schemas';
import { ChainArtifacts, ChainBuilderContext, ChainBuilderContextWithHelpers, ContractMap, PackageState } from '../types';
import { encodeDeployData, getContractDefinitionFromPath, getMergedAbiFromContractPaths } from '../util';

const debug = Debug('cannon:builder:router');

/**
 *  Available properties for router operation
 *  @public
 *  @group Router
 */
export type Config = z.infer<typeof routerSchema>;

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export
// address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
const routerStep = {
  label: 'router',

  validate: routerSchema,

  async getState(runtime: ChainBuilderRuntime, ctx: ChainBuilderContextWithHelpers, config: Config) {
    const newConfig = this.configInject(ctx, config);

    const contractAbis: { [contractName: string]: viem.Abi } = {};
    const contractAddresses: { [contractName: string]: string } = {};

    for (const n of newConfig.contracts) {
      const contract = getContractDefinitionFromPath(ctx, n);
      if (!contract) {
        throw new Error(`contract not found: ${n}`);
      }

      contractAbis[n] = contract.abi;
      contractAddresses[n] = contract.address;
    }

    return [
      {
        contractAbis,
        contractAddresses,
        config: newConfig,
      },
    ];
  },

  configInject(ctx: ChainBuilderContextWithHelpers, config: Config) {
    config = _.cloneDeep(config);

    config.contracts = _.map(config.contracts, (n) => _.template(n)(ctx));

    if (config.from) {
      config.from = _.template(config.from)(ctx);
    }

    if (config.salt) {
      config.salt = _.template(config.salt)(ctx);
    }

    return config;
  },

  getInputs(config: Config, possibleFields: string[]) {
    let accesses = computeTemplateAccesses(config.from);
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.salt, possibleFields));
    accesses.accesses.push(
      ...config.contracts.map((c) => (c.includes('.') ? `imports.${c.split('.')[0]}` : `contracts.${c}`))
    );

    return accesses;
  },

  getOutputs(_: Config, packageState: PackageState) {
    return [`contracts.${packageState.currentLabel.split('.')[1]}`, `${packageState.currentLabel.split('.')[1]}`];
  },

  async exec(
    runtime: ChainBuilderRuntime,
    ctx: ChainBuilderContext,
    config: Config,
    packageState: PackageState
  ): Promise<ChainArtifacts> {
    const { generateRouter, getCompileInput, compileContract } = await import('@synthetixio/router');

    debug('exec', config);

    const contracts = config.contracts.map((n) => {
      const contract = getContractDefinitionFromPath(ctx, n);
      if (!contract) {
        throw new Error(`contract not found: ${n}`);
      }

      return {
        constructorArgs: contract.constructorArgs,
        abi: contract.abi,
        deployedAddress: contract.address ? viem.getAddress(contract.address) : contract.address, // Make sure address is checksum encoded
        deployTxnHash: contract.deployTxnHash,
        deployTxnBlockNumber: '',
        deployTimestamp: '',
        contractName: contract.contractName,
        sourceName: contract.sourceName,
        contractFullyQualifiedName: `${contract.sourceName}:${contract.contractName}`,
      };
    });

    const contractName = packageState.currentLabel.slice('router.'.length);

    const sourceCode = generateRouter({
      contractName,
      contracts: contracts as any,
      canReceivePlainETH: config.includeReceive,
    });

    debug('router source code', sourceCode);

    // On Mainnet, use default local solc evmVersion, for everything else, 'paris'
    const evmVersion = [1, 5, 11155111].includes(runtime.chainId) ? undefined : 'paris';

    const inputData = getCompileInput(contractName, sourceCode, evmVersion);
    const solidityInfo = await compileContract(contractName, sourceCode, evmVersion);

    // the abi is entirely basedon the fallback call so we have to generate ABI here
    const routableAbi = getMergedAbiFromContractPaths(ctx, config.contracts);

    runtime.reportContractArtifact(`${contractName}.sol:${contractName}`, {
      contractName,
      sourceName: `${contractName}.sol`,
      abi: routableAbi,
      bytecode: solidityInfo.bytecode as viem.Hex,
      deployedBytecode: solidityInfo.deployedBytecode,
      linkReferences: {},
      source: {
        solcVersion: solidityInfo.solcVersion,
        input: JSON.stringify(inputData),
      },
    });

    const signer = config.from
      ? await runtime.getSigner(config.from as viem.Address)
      : await runtime.getDefaultSigner({ data: solidityInfo.bytecode as viem.Hex }, config.salt);

    debug('using deploy signer with address', signer.address);

    const preparedTxn = await signer.wallet.prepareTransactionRequest({
      account: signer.wallet.account || signer.address!,
      data: encodeDeployData({
        abi: solidityInfo.abi,
        bytecode: solidityInfo.bytecode as viem.Hash,
      }),
      chain: undefined,
    });
    const hash = await signer.wallet.sendTransaction(preparedTxn as any);

    const receipt = await runtime.provider.waitForTransactionReceipt({ hash });

    const block = await runtime.provider.getBlock({ blockHash: receipt.blockHash });

    return {
      contracts: {
        [contractName]: {
          address: receipt.contractAddress,
          abi: routableAbi,
          deployedOn: packageState.currentLabel,
          deployTxnHash: receipt.transactionHash,
          deployTxnBlockNumber: receipt.blockNumber.toString(),
          deployTimestamp: block.timestamp.toString(),
          contractName,
          sourceName: contractName + '.sol',
          gasUsed: Number(receipt.gasUsed),
          gasCost: receipt.effectiveGasPrice.toString(),
        },
      } as ContractMap,
    };
  },
};

export default routerStep;
