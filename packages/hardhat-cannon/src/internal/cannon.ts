import path from 'node:path';
import { ContractMap } from '@usecannon/builder';
import { build, getProvider, loadCannonfile, PackageSettings } from '@usecannon/cli';
import { SUBTASK_GET_ARTIFACT } from '../task-names';
import { getHardhatSigners } from './get-hardhat-signers';
import { loadPackageJson } from './load-pkg-json';

import * as viem from 'viem';

import type { CannonRpcNode } from '@usecannon/cli/src/rpc';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { BuildOutputs } from '../types';

interface BuildOptions {
  hre: HardhatRuntimeEnvironment;
  node: CannonRpcNode;
  cannonfile: string;
  preset: string;
  settings: PackageSettings;
  registryPriority?: 'local' | 'onchain' | 'offline';
}

export async function cannonBuild(options: BuildOptions) {
  const { hre } = options;
  const provider = getProvider(options.node)!;
  const signers = getHardhatSigners(options.hre /*, provider*/);

  const getSigner = async (address: viem.Address) => {
    const addr = viem.getAddress(address);
    for (const signer of signers) {
      if (viem.isAddressEqual(addr, signer.address)) {
        return {
          address: addr,
          wallet: viem.createWalletClient({
            account: signer,
            transport: viem.custom(provider.transport),
            chain: provider.chain,
          }),
        };
      }
    }

    throw new Error(`Signer for address "${address}" not found`);
  };

  const { name, version, def } = await loadCannonfile(path.join(hre.config.paths.root, options.cannonfile));

  const { outputs } = await build({
    provider,
    def,
    packageDefinition: {
      name,
      version,
      settings: options.settings,
    },
    getArtifact: async (contractName: string) => await hre.run(SUBTASK_GET_ARTIFACT, { name: contractName }),
    getSigner,
    getDefaultSigner: async () => getSigner(signers[0].address),
    presetArg: options.preset,
    pkgInfo: loadPackageJson(path.join(hre.config.paths.root, 'package.json')),
    projectDirectory: hre.config.paths.root,
    registryPriority: options.registryPriority,
    publicSourceCode: false,
  });

  return { outputs };
}

export function getContractDataFromOutputs(outputs: BuildOutputs, contractName: string) {
  const contracts = getAllContractDatasFromOutputs(outputs);
  const contract = contracts[contractName];

  if (!contract) {
    const list = Object.keys(contracts).join('\n  ');
    throw new Error(`Contract "${contractName}" not found on cannon build. Possible options: \n${list}`);
  }

  return contract;
}

export function getAllContractDatasFromOutputs(outputs: BuildOutputs) {
  const result: ContractMap = {};
  _setContractsDatasFromOutputs(outputs, result);
  return result;
}

function _setContractsDatasFromOutputs(outputs: BuildOutputs, result: ContractMap, scope?: string) {
  // this logic handles deeply nested imports such as synthetix.oracle_manager
  // which is really outputs.imports.synthetix.imports.oracle_manager
  const from = scope
    ? scope.split('.').reduce((outputs, importName) => {
        const from = outputs.imports?.[importName];
        if (!from) throw new Error(`Could not find imports named "${importName}"`);
        return from;
      }, outputs)
    : outputs;

  for (const [contractName, contractData] of Object.entries(from.contracts || {})) {
    const key = scope ? `${scope}.${contractName}` : contractName;
    result[key] = contractData;
  }

  for (const subScope of Object.keys(from.imports || {})) {
    const newScope = scope ? `${scope}.${subScope}` : subScope;
    _setContractsDatasFromOutputs(outputs, result, newScope);
  }
}
