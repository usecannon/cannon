import Debug from 'debug';
import _ from 'lodash';
import * as viem from 'viem';
import { z } from 'zod';
import { ARACHNID_DEFAULT_DEPLOY_ADDR, ensureArachnidCreate2Exists, makeArachnidCreate2Txn } from '../create2';
import { computeTemplateAccesses, mergeTemplateAccesses } from '../access-recorder';
import { ChainBuilderRuntime } from '../runtime';
import { diamondSchema } from '../schemas';
import {
  ChainArtifacts,
  ChainBuilderContext,
  ChainBuilderContextWithHelpers,
  ContractArtifact,
  ContractMap,
  PackageState,
} from '../types';
import { encodeDeployData, getContractDefinitionFromPath, getMergedAbiFromContractPaths } from '../util';
import { template } from '../utils/template';

const debug = Debug('cannon:builder:diamond');

/**
 *  Available properties for diamond operation
 *  @public
 *  @group Diamond
 */
export type Config = z.infer<typeof diamondSchema>;

// get function selectors from ABI
function getFacetSelectors(abi: viem.Abi) {
  const selectors = abi
    .map((item: viem.AbiItem) => {
      if (item.type === 'function') {
        return viem.toFunctionSelector(item);
      }

      return null;
    })
    .filter((v) => v);
  return selectors;
}

// ensure the specified contract is already deployed
// if not deployed, deploy the specified hardhat contract with specfied options, export
// address, abi, etc.
// if already deployed, reexport deployment options for usage downstream and exit with no changes
const diamondStep = {
  label: 'diamond',

  validate: diamondSchema,

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

    config.contracts = _.map(config.contracts, (n) => template(n)(ctx));

    config.diamondArgs.owner = template(config.diamondArgs.owner)(ctx);
    if (config.diamondArgs.init) {
      config.diamondArgs.init = template(config.diamondArgs.init)(ctx);
    } else {
      config.diamondArgs.init = viem.zeroAddress;
    }
    if (config.diamondArgs.initCalldata) {
      config.diamondArgs.initCalldata = template(config.diamondArgs.initCalldata)(ctx);
    } else {
      config.diamondArgs.initCalldata = '0x';
    }

    config.salt = template(config.salt)(ctx);

    if (config?.overrides?.gasLimit) {
      config.overrides.gasLimit = template(config.overrides.gasLimit)(ctx);
    }

    return config;
  },

  getInputs(config: Config, possibleFields: string[]) {
    let accesses = computeTemplateAccesses(config.diamondArgs.owner, possibleFields);
    if (config.diamondArgs.init) {
      accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.diamondArgs.init, possibleFields));
    }

    if (config.diamondArgs.initCalldata) {
      accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.diamondArgs.initCalldata, possibleFields));
    }

    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.salt, possibleFields));
    accesses.accesses.push(
      ...config.contracts.map((c) => (c.includes('.') ? `imports.${c.split('.')[0]}` : `contracts.${c}`))
    );

    if (config?.overrides) {
      accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.overrides.gasLimit, possibleFields));
    }

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
    debug('exec', config);

    const stepName = packageState.currentLabel.split('.')[1];

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

    debug('first time deploy? ', !!ctx.contracts[stepName]);
    let outputContracts = ctx.contracts[stepName] ? ctx.contracts : await firstTimeDeploy(runtime, config, packageState);
    const deployedContracts = config.immutable
      ? [stepName + 'DiamondLoupeFacet']
      : [
          stepName + 'OwnershipFacet',
          stepName + 'DiamondLoupeFacet',
          stepName + 'DiamondCutFacet',
          stepName + 'DiamondWipeAndPaveFacet',
        ];
    outputContracts = _.pick(outputContracts, [stepName, ...deployedContracts]);
    debug('output contracts', [stepName, ...deployedContracts]);

    // ensure that diamond errors can be decoded if we run into an error on the next step(s)
    runtime.updateProviderArtifacts({ contracts: outputContracts });

    const proxyAddress = outputContracts[stepName].address;

    // put the abis together
    outputContracts[stepName as any].abi = getMergedAbiFromContractPaths(_.merge({}, ctx, { contracts: outputContracts }), [
      ...deployedContracts,
      ...config.contracts,
    ]);

    // finally, do the cut operation
    const updateFacets = [];

    for (const facetName of deployedContracts) {
      updateFacets.push({
        action: 0,
        facetAddress: outputContracts[facetName].address,
        functionSelectors: getFacetSelectors(outputContracts[facetName].abi as viem.Abi),
      });
    }

    for (const contract of contracts) {
      updateFacets.push({
        action: 0,
        facetAddress: contract.deployedAddress,
        functionSelectors: getFacetSelectors(contract.abi),
      });
    }

    debug('the new facets', updateFacets);

    const ownerSigner = await runtime.getSigner(config.diamondArgs.owner as viem.Address);

    // todo: what to do about the owner of the proxy changing unexpectedly?
    try {
      const preparedTxn = await runtime.provider.prepareTransactionRequest({
        account: ownerSigner.wallet.account || ownerSigner.address,
        to: proxyAddress,
        data: viem.encodeFunctionData({
          abi: (await import('../abis/diamond/DiamondWipeAndPaveFacet.json')).abi,
          functionName: 'diamondWipeAndPave',
          args: [updateFacets, config.diamondArgs.init, config.diamondArgs.initCalldata],
        }),
        ...config.overrides,
      } as any);

      const txn = await ownerSigner.wallet.sendTransaction(preparedTxn as any);

      const receipt = await runtime.provider.waitForTransactionReceipt({ hash: txn });
      debug('got receipt', receipt);

      return {
        contracts: outputContracts,
        txns: {
          [`${stepName}_diamondCut`]: {
            hash: txn,
            events: {},
            deployedOn: packageState.currentLabel,
            gasUsed: Number(receipt.gasUsed),
            gasCost: receipt.effectiveGasPrice.toString(),
            signer: viem.getAddress(receipt.from),
          },
        },
      };
    } catch (err) {
      throw new Error(
        `failed to cut (upgrade) the diamond which is already deployed. This could happen for a few reasons:\n* the diamond owner has been changed and is now incorrect.\n* the diamond was previously made immutable and can no longer can be upgraded.\noriginal error: ${err}`
      );
    }
  },
};

async function firstTimeDeploy(
  runtime: ChainBuilderRuntime,
  config: Config,
  packageState: PackageState
): Promise<ContractMap> {
  const stepName = packageState.currentLabel.split('.')[1];

  const signer = await runtime.getDefaultSigner(
    { data: viem.keccak256(viem.encodePacked(['string'], [config.salt])) as viem.Hex },
    config.salt
  );

  debug('using deploy signer with address', signer.address);

  const outputContracts: ContractMap = {};
  // first, deploy the basic facets
  const arachnidDeployerAddress = await ensureArachnidCreate2Exists(runtime, ARACHNID_DEFAULT_DEPLOY_ADDR);

  const deployContract = async function (
    contract: ContractArtifact,
    deployedContractLabel: string,
    constructorArgs: any[],
    salt = ''
  ) {
    debug('deploy contract', contract.contractName, deployedContractLabel, constructorArgs, salt);
    runtime.reportContractArtifact(`${contract.contractName}.sol:${contract.contractName}`, {
      contractName: contract.contractName,
      sourceName: `${contract.contractName}.sol`,
      abi: contract.abi as any,
      bytecode: contract.bytecode as viem.Hex,
      deployedBytecode: contract.deployedBytecode,
      linkReferences: {},
      source: contract.source,
    });

    const preparedTxn = await signer.wallet.prepareTransactionRequest({
      account: signer.wallet.account || signer.address!,
      data: encodeDeployData({
        abi: contract.abi,
        bytecode: contract.bytecode as viem.Hash,
        args: constructorArgs,
      }),
      chain: undefined,
    });

    if (config.overrides?.gasLimit) {
      preparedTxn.gas = BigInt(config.overrides.gasLimit);
    }

    if (runtime.gasPrice) {
      preparedTxn.gasPrice = runtime.gasPrice;
    }

    if (runtime.gasFee) {
      preparedTxn.maxFeePerGas = runtime.gasFee;
    }

    if (runtime.priorityGasFee) {
      preparedTxn.maxPriorityFeePerGas = runtime.priorityGasFee;
    }

    const [create2Txn, addr] = makeArachnidCreate2Txn(salt, preparedTxn.data!, arachnidDeployerAddress);
    debug(`create2: deploy ${addr} by ${arachnidDeployerAddress}`);

    const bytecode = await runtime.provider.getCode({ address: addr });

    if (!bytecode) {
      const hash = await signer.wallet.sendTransaction(
        _.assign({ account: signer.wallet.account || signer.address }, create2Txn as any)
      );
      const receipt = await runtime.provider.waitForTransactionReceipt({ hash });
      const block = await runtime.provider.getBlock({ blockHash: receipt.blockHash });
      outputContracts[deployedContractLabel] = {
        address: addr,
        abi: contract.abi,
        deployedOn: packageState.currentLabel,
        deployTxnHash: receipt.transactionHash,
        deployTxnBlockNumber: receipt.blockNumber.toString(),
        deployTimestamp: block.timestamp.toString(),
        contractName: contract.contractName,
        sourceName: contract.sourceName,
        highlight: deployedContractLabel === stepName ? config.highlight : false,
        gasUsed: Number(receipt.gasUsed),
        gasCost: receipt.effectiveGasPrice.toString(),
      };
    } else {
      outputContracts[deployedContractLabel] = {
        address: addr,
        abi: contract.abi,
        deployedOn: packageState.currentLabel,
        deployTxnHash: '',
        deployTxnBlockNumber: '',
        deployTimestamp: '',
        contractName: contract.contractName,
        sourceName: contract.sourceName,
        highlight: deployedContractLabel === stepName ? config.highlight : false,
        gasUsed: Number(0),
        gasCost: '0',
      };
    }

    return addr;
  };

  const baseFacets = await Promise.all([
    import('../abis/diamond/OwnershipFacet.json'),
    import('../abis/diamond/DiamondLoupeFacet.json'),
  ]);

  const mutabilityFacets = await Promise.all([
    import('../abis/diamond/DiamondCutFacet.json'),
    import('../abis/diamond/DiamondWipeAndPaveFacet.json'),
  ]);

  const addFacets = [];
  for (const facet of [...baseFacets, ...mutabilityFacets]) {
    // load the diamond proxy contracts which may need to be deployed:
    const deployedAddr = await deployContract(facet as any, stepName + facet.contractName, []);
    addFacets.push({ action: 0, facetAddress: deployedAddr, functionSelectors: getFacetSelectors(facet.abi as viem.Abi) });
  }

  // then, deploy the proxy
  debug('deploying', addFacets);
  await deployContract(
    (await import('../abis/diamond/Diamond.json')) as any,
    stepName,
    [addFacets, config.diamondArgs],
    config.salt || ''
  );

  return outputContracts;
}

export default diamondStep;
