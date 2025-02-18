import {
  ChainArtifacts,
  ChainDefinition,
  ContractData,
  DeploymentInfo,
  DeploymentState,
  fetchIPFSAvailability,
  getArtifacts,
} from '@usecannon/builder';
import { bold, cyan, green, yellow } from 'chalk';
import Debug from 'debug';
import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
import { getContractsAndDetails, getSourceFromRegistry } from '../helpers';
import { getMainLoader } from '../loader';
import { createDefaultReadRegistry } from '../registry';
import { CliSettings } from '../settings';
import { log } from '../util/console';

const debug = Debug('cannon:cli:inspect');

const formatTypes = ['overview', 'deploy-json', 'misc-json', 'artifact-json'] as const;

type FormatType = (typeof formatTypes)[number];

export async function inspect(
  fullPackageRef: string,
  ipfsUrl: string,
  chainId: number,
  deployInfo: DeploymentInfo,
  cliSettings: CliSettings,
  out: FormatType,
  writeDeployments: string,
  sources: boolean
) {
  if (out && !formatTypes.includes(out)) {
    throw new Error(`invalid --out value: "${out}". Valid types are: '${formatTypes.join("' | '")}'`);
  }

  const resolver = await createDefaultReadRegistry(cliSettings);
  const loader = getMainLoader(cliSettings);

  // Mute all build outputs when printing the result to json, this is so it
  // doesn't break the result.
  if (out && out !== 'overview') {
    // eslint-disable-next-line no-console
    console.log = debug;
    // eslint-disable-next-line no-console
    console.debug = debug;
  }

  const chainDefinition = new ChainDefinition(deployInfo.def);

  if (writeDeployments) {
    const stateContracts = _getNestedStateContracts(deployInfo.state, writeDeployments);
    const files = Array.from(stateContracts.entries());

    await Promise.all(
      files.map(([filepath, contractData]) => {
        return fs.outputFile(filepath, JSON.stringify(contractData, null, 2));
      })
    );
  }

  if (out === 'deploy-json') {
    _outputJson(deployInfo);
  } else if (out === 'misc-json') {
    if (!deployInfo.miscUrl) {
      log('null');
      return;
    }
    const miscData = await loader[deployInfo.miscUrl.split(':')[0] as 'ipfs'].read(deployInfo.miscUrl);
    _outputJson(miscData);
  } else if (out === 'artifact-json') {
    _outputJson(getArtifacts(chainDefinition, deployInfo.state));
  } else {
    const metaUrl = await resolver.getMetaUrl(fullPackageRef, chainId);
    const packageOwner = deployInfo.def.setting?.owner?.defaultValue;
    const localSource = getSourceFromRegistry(resolver.registries);
    const ipfsAvailabilityScore = await fetchIPFSAvailability(cliSettings.ipfsUrl, ipfsUrl.replace('ipfs://', ''));
    const contractsAndDetails = getContractsAndDetails(deployInfo.state);
    const miscData = await loader.ipfs.read(deployInfo.miscUrl);
    const contractSources = _listSourceCodeContracts(miscData);

    log(green(bold(`\n=============== ${fullPackageRef} (chainId: ${chainId}) ===============`)));
    log();
    log(
      '   Deploy Status:',
      deployInfo.status === 'partial' ? yellow(bold(deployInfo.status)) : green(deployInfo.status || 'complete')
    );
    log(
      '         Options:',
      Object.entries(deployInfo.options)
        .map((o) => `${o[0]}=${o[1]}`)
        .join(' ') || '(none)'
    );
    packageOwner ? log('           Owner:', packageOwner) : log('          Source:', localSource || '(none)');
    log('     Package URL:', ipfsUrl);
    log('        Misc URL:', deployInfo.miscUrl);
    log('Package Info URL:', metaUrl || '(none)');
    log('Cannon Generator:', deployInfo.generator);
    log('       Timestamp:', new Date(deployInfo.timestamp * 1000).toLocaleString());
    log('Contract Sources:', bold((contractSources.length ? yellow : green)(contractSources.length + ' sources included')));
    log();
    log('IPFS Availability Score(# of nodes): ', ipfsAvailabilityScore || 'Run IPFS Locally to get this score');
    log();
    log(yellow(bold('Smart Contracts')));
    log(`Note: Any ${bold('contract name')} that is bolded is highlighted and marked as important.`);
    log('Contract Addresses:');
    log('-------------------');
    for (const contractName in contractsAndDetails) {
      const { address, highlight } = contractsAndDetails[contractName];
      const displayName = highlight ? bold(contractName) : contractName;
      log(`${displayName}: ${address}`);
    }
    log('-------------------');
    log();
    if (sources) {
      log('Contract Info:');
      log('-------------------');
      for (const contractName in contractsAndDetails) {
        const { sourceName, highlight } = contractsAndDetails[contractName];
        if (sourceName) {
          const displayName = highlight ? bold(contractName) : contractName;
          log(`${displayName}: ${sourceName}`);
        }
      }
      log('-------------------');
    }
    log();
    log(cyan(bold('Cannonfile Topology')));
    log(cyan(chainDefinition.printTopology().join('\n')));
  }

  return deployInfo;
}

function _getNestedStateContracts(state: DeploymentState, pathname = '', result = new Map<string, ContractData>()) {
  for (const { artifacts } of Object.values(state)) {
    _getNestedStateFiles(artifacts, pathname, result);
  }

  return result;
}

function _getNestedStateFiles(artifacts: ChainArtifacts, pathname: string, result: Map<string, ContractData>) {
  if (artifacts.contracts) {
    for (const [contractName, contractData] of Object.entries(artifacts.contracts)) {
      const filepath = path.join(pathname, `${contractName}.json`);
      result.set(filepath, contractData);
    }
  }

  if (artifacts.imports) {
    for (const [importName, importArtifacts] of Object.entries(artifacts.imports)) {
      _getNestedStateFiles(importArtifacts, path.join(pathname, importName), result);
    }
  }

  return result;
}

// TODO: types
function _listSourceCodeContracts(miscData: any) {
  return Object.keys(_.pickBy(miscData.artifacts, (v) => v.source));
}

function _outputJson(obj: object) {
  const toOutput = JSON.stringify(obj, null, 2);

  const chunkSize = 16;
  for (let i = 0; i < toOutput.length; i += chunkSize) {
    process.stdout.write(toOutput.slice(i, i + chunkSize));
  }
}
