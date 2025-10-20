import Debug from 'debug';
import _ from 'lodash';
import * as viem from 'viem';
import { z } from 'zod';
import { generateRouter } from '@usecannon/router';
import { ARACHNID_DEFAULT_DEPLOY_ADDR, ensureArachnidCreate2Exists, makeArachnidCreate2Txn } from '../create2';
import { CannonError } from '../error';
import { computeTemplateAccesses, mergeTemplateAccesses } from '../access-recorder';
import { routerSchema } from '../schemas';
import { ContractMap } from '../types';
import {
  encodeDeployData,
  getContractDefinitionFromPath,
  removeConstructorFromAbi,
  getMergedAbiFromContractPaths,
} from '../util';
import { template } from '../utils/template';
import { compileContract } from '../utils/compile';
import { CannonAction } from '../actions';

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

  async getState(runtime, ctx, config, packageState) {
    const newConfig = this.configInject(ctx, config, packageState);

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
      [
        contractAbis,
        contractAddresses,
        [
          newConfig.salt,
          newConfig.overrides,
          newConfig.includeReceive,
          newConfig.includeDiamondCompatibility,
          newConfig.highlight,
          newConfig.create2,
        ],
      ],
      {
        contractAbis,
        contractAddresses,
        config: newConfig,
      },
      {
        contractAbis,
        contractAddresses,
        config: _.omit(newConfig, 'includeDiamondCompatibility'),
      },
      {
        contractAbis,
        contractAddresses,
        config: _.omit(newConfig, 'includeReceive', 'includeDiamondCompatibility'),
      },
    ];
  },

  configInject(ctx, config) {
    config = _.cloneDeep(config);

    config.contracts = _.map(config.contracts, (n) => template(n, ctx));

    if (config.from) {
      config.from = template(config.from, ctx);
    }

    if (config.salt) {
      config.salt = template(config.salt, ctx);
    }

    if (config.create2) {
      // template the address if its a string
      if (typeof config.create2 === 'string') {
        config.create2 = template(config.create2, ctx);
      }
    }

    if (config?.overrides?.gasLimit) {
      config.overrides.gasLimit = template(config.overrides.gasLimit, ctx);
    }

    if (_.isUndefined(config.includeDiamondCompatibility)) {
      config.includeDiamondCompatibility = true;
    }

    return config;
  },

  getInputs(config, possibleFields) {
    let accesses = computeTemplateAccesses(config.from);
    accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.salt, possibleFields));
    accesses = mergeTemplateAccesses(
      accesses,
      computeTemplateAccesses(typeof config.create2 === 'string' ? config.create2 : '', possibleFields)
    );
    accesses.accesses.push(
      ...config.contracts.map((c) => (c.includes('.') ? `imports.${c.split('.')[0]}` : `contracts.${c}`))
    );

    if (config?.overrides) {
      accesses = mergeTemplateAccesses(accesses, computeTemplateAccesses(config.overrides.gasLimit, possibleFields));
    }

    return accesses;
  },

  getOutputs(_, packageState) {
    const name = packageState.currentLabel.split('.')[1];
    return [`contracts.${name}`, name];
  },

  async exec(runtime, ctx, config, packageState) {
    debug('exec', config);

    const contracts = config.contracts.map((n) => {
      const contract = getContractDefinitionFromPath(ctx, n);
      if (!contract) {
        throw new Error(`contract not found: ${n}`);
      }

      const contractName = n.replace('.', '_'); // Use step name, and replace '.' in case is pointing to an import.

      return {
        constructorArgs: contract.constructorArgs,
        abi: contract.abi,
        deployedAddress: contract.address ? viem.getAddress(contract.address) : contract.address, // Make sure address is checksum encoded
        deployTxnHash: contract.deployTxnHash,
        deployTxnBlockNumber: '',
        deployTimestamp: '',
        contractName: contractName,
        sourceName: contract.sourceName,
        contractFullyQualifiedName: `${contract.sourceName}:${contractName}`,
      };
    });

    const contractName = packageState.currentLabel.slice('router.'.length);

    const sourceCode = generateRouter({
      contractName,
      contracts: contracts as any,
      canReceivePlainETH: config.includeReceive,
      hasDiamondCompat: config.includeDiamondCompatibility,
    });

    debug('router source code', sourceCode);

    const { input: inputData, output: solidityInfo } = await compileContract(contractName, sourceCode);

    const diamondFacetCompatAbi = viem.parseAbi([
      'function facets() pure returns ((address facetAddress, bytes4[] functionSelectors)[])',
      'function facetFunctionSelectors(address facet) pure returns (bytes4[] functionSelectors)',
      'function facetAddresses() pure returns (address[] addresses)',
      'function facetAddress(bytes4 functionSelector) pure returns (address)',
      'function emitDiamondCutEvent() returns (bool)',
    ]);

    // the ABI is entirely based on the fallback call so we have to generate ABI here
    // TODO: possible if the user includes their own diamond contracts, they could clash with the abi we are adding here for diamond.
    // they will need to turn off diamond compat in that case
    const routableAbi = [
      ...(config.includeDiamondCompatibility ? diamondFacetCompatAbi : []),
      ...getMergedAbiFromContractPaths(ctx, config.contracts),
    ];

    // remove constructor from ABI, we don't need it
    const abi = removeConstructorFromAbi(routableAbi);

    runtime.reportContractArtifact(`${contractName}.sol:${contractName}`, {
      contractName,
      sourceName: `${contractName}.sol`,
      abi,
      bytecode: solidityInfo.bytecode as viem.Hex,
      deployedBytecode: solidityInfo.deployedBytecode,
      linkReferences: {},
      source: {
        solcVersion: solidityInfo.solcVersion,
        input: JSON.stringify(inputData),
      },
    });

    const txn = {
      data: encodeDeployData({
        abi: solidityInfo.abi,
        bytecode: solidityInfo.bytecode as viem.Hex,
        args: [],
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

    let receipt: viem.TransactionReceipt;
    let deployAddress: viem.Address;

    if (config.create2) {
      const arachnidDeployerAddress = await ensureArachnidCreate2Exists(
        runtime,
        typeof config.create2 === 'string' ? (config.create2 as viem.Address) : ARACHNID_DEFAULT_DEPLOY_ADDR
      );

      debug('performing arachnid create2');
      const [create2Txn, addr] = makeArachnidCreate2Txn(config.salt || '', txn.data!, arachnidDeployerAddress);
      deployAddress = addr;
      debug(`create2: deploy ${addr} by ${arachnidDeployerAddress}`);

      const bytecode = await runtime.provider.getCode({ address: addr });

      if (bytecode && bytecode !== '0x') {
        debug('create2 contract already completed');
        // the cannon state does not think a contract should be deployed, but the on-chain state says a contract
        // is deployed. this could be a mistake. alert the user and explain how to override
        if (config.ifExists !== 'continue') {
          throw new CannonError(
            `The contract at the create2 destination ${addr} is already deployed, but the Cannon state does not recognize that this contract has already been deployed. This typically indicates incorrect upgrade configuration. Please confirm if this contract should already be deployed or not, and if you want to continue the build as-is, add 'ifExists = "continue"' to the step definition`,
            'CREATE2_COLLISION'
          );
        }
      }

      const signer = config.from
        ? await runtime.getSigner(config.from as viem.Address)
        : await runtime.getDefaultSigner!(txn, config.salt);

      const fullCreate2Txn = _.assign(create2Txn, overrides, { account: signer.wallet.account || signer.address });
      debug('final create2 txn', fullCreate2Txn);

      const preparedTxn = await runtime.provider.prepareTransactionRequest(fullCreate2Txn);

      const hash = await signer.wallet.sendTransaction(preparedTxn as any);
      receipt = await runtime.provider.waitForTransactionReceipt({ hash });
      debug('arachnid create2 complete', receipt);
    } else {
      const signer = config.from
        ? await runtime.getSigner(config.from as viem.Address)
        : await runtime.getDefaultSigner!(txn, config.salt);
      debug('using deploy signer with address', signer.address);

      const preparedTxn = await signer.wallet.prepareTransactionRequest(
        _.assign(txn, overrides, { account: signer.wallet.account || signer.address })
      );

      const hash = await signer.wallet.sendTransaction(preparedTxn as any);
      receipt = await runtime.provider.waitForTransactionReceipt({ hash });
      deployAddress = receipt.contractAddress!;
    }

    const block = await runtime.provider.getBlock({ blockHash: receipt.blockHash });

    return {
      contracts: {
        [contractName]: {
          address: deployAddress,
          abi: routableAbi,
          deployedOn: packageState.currentLabel,
          deployTxnHash: receipt.transactionHash,
          deployTxnBlockNumber: receipt.blockNumber.toString(),
          deployTimestamp: block.timestamp.toString(),
          contractName,
          sourceName: contractName + '.sol',
          highlight: config.highlight,
          gasUsed: Number(receipt.gasUsed),
          gasCost: receipt.effectiveGasPrice.toString(),
        },
      } as ContractMap,
    };
  },
} satisfies CannonAction<Config>;

export default routerStep;
