import Debug from 'debug';
import _ from 'lodash';
import z from 'zod';
import { routerSchema } from '../schemas.zod';
import { ChainBuilderRuntime } from '../runtime';
import { ChainArtifacts, ChainBuilderContext, ChainBuilderContextWithHelpers, PackageState } from '../types';
import { getContractDefinitionFromPath, getMergedAbiFromContractPaths } from '../util';
import { computeTemplateAccesses } from '../access-recorder';
import { Abi, Address, Hex } from 'viem';

const debug = Debug('cannon:builder:router');

/**
 *  Available properties for router step
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

    const contractAbis: { [contractName: string]: Abi } = {};
    const contractAddresses: { [contractName: string]: string } = {};

    for (const n of newConfig.contracts) {
      const contract = getContractDefinitionFromPath(ctx, n);
      if (!contract) {
        throw new Error(`contract not found: ${n}`);
      }

      contractAbis[n] = contract.abi;
      contractAddresses[n] = contract.address;
    }

    return {
      contractAbis,
      contractAddresses,
      config: newConfig,
    };
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

  getInputs(config: Config) {
    const accesses: string[] = [];

    accesses.push(...computeTemplateAccesses(config.from));
    accesses.push(...computeTemplateAccesses(config.salt));

    return config.contracts.map((c) => (c.includes('.') ? `imports.${c.split('.')[0]}` : `contracts.${c}`));
  },

  getOutputs(_: Config, packageState: PackageState) {
    return [`contracts.${packageState.currentLabel.split('.')[1]}`];
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
        deployedAddress: contract.address,
        deployTxnHash: contract.deployTxnHash,
        contractName: contract.contractName,
        sourceName: contract.sourceName,
        contractFullyQualifiedName: `${contract.sourceName}:${contract.contractName}`,
      };
    });

    const contractName = packageState.currentLabel.slice('router.'.length);

    const sourceCode = generateRouter({
      contractName,
      contracts: contracts as any,
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
      bytecode: solidityInfo.bytecode as Hex,
      deployedBytecode: solidityInfo.deployedBytecode,
      linkReferences: {},
      source: {
        solcVersion: solidityInfo.solcVersion,
        input: JSON.stringify(inputData),
      },
    });

    const signer = config.from
      ? await runtime.getSigner(config.from as Address)
      : await runtime.getDefaultSigner({ data: solidityInfo.bytecode as Hex }, config.salt);

    debug('using deploy signer with address', await signer.address);

    const hash = await signer.wallet.deployContract({
      account: signer.address,
      bytecode: solidityInfo.bytecode as Hex,
      chain: undefined,
      abi: [],
    });

    const receipt = await runtime.provider.waitForTransactionReceipt({ hash });

    return {
      contracts: {
        [contractName]: {
          address: receipt.contractAddress,
          abi: routableAbi,
          deployedOn: packageState.currentLabel,
          deployTxnHash: receipt.transactionHash,
          contractName,
          sourceName: contractName + '.sol',
          gasUsed: Number(receipt.gasUsed),
          gasCost: receipt.effectiveGasPrice.toString(),
          //sourceCode
        },
      },
    };
  },
};

export default routerStep;
