import {
  ChainArtifacts,
  ChainDefinition,
  ContractData,
  DeploymentInfo,
  DeploymentState,
  fetchIPFSAvailability,
  getArtifacts,
} from '@usecannon/builder';
import chalk from 'chalk';
import Debug from 'debug';
import fs from 'fs-extra';
import { pickBy } from 'lodash-es';
import path from 'path';
import { getContractsAndDetails, getSourceFromRegistry } from '../helpers.js';
import { getMainLoader } from '../loader.js';
import { createDefaultReadRegistry } from '../registry.js';
import { CliSettings } from '../settings.js';
import { logSpinner } from '../util/console.js';

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
  sources: boolean,
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
      }),
    );
  }

  if (out === 'deploy-json') {
    _outputJson(deployInfo);
  } else if (out === 'misc-json') {
    if (!deployInfo.miscUrl) {
      logSpinner('null');
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

    logSpinner(chalk.green(chalk.bold(`\n=============== ${fullPackageRef} (chainId: ${chainId}) ===============`)));
    logSpinner();
    logSpinner(
      '   Deploy Status:',
      deployInfo.status === 'partial'
        ? chalk.yellow(chalk.bold(deployInfo.status))
        : chalk.green(deployInfo.status || 'complete'),
    );
    logSpinner(
      '         Options:',
      Object.entries(deployInfo.options)
        .map((o) => `${o[0]}=${o[1]}`)
        .join(' ') || '(none)',
    );
    if (packageOwner) {
      logSpinner('           Owner:', packageOwner);
    } else {
      logSpinner('          Source:', localSource || '(none)');
    }
    logSpinner('     Package URL:', ipfsUrl);
    logSpinner('        Misc URL:', deployInfo.miscUrl);
    logSpinner('Package Info URL:', metaUrl || '(none)');
    logSpinner('Cannon Generator:', deployInfo.generator);
    logSpinner('       Timestamp:', new Date(deployInfo.timestamp * 1000).toLocaleString());
    logSpinner(
      'Contract Sources:',
      chalk.bold((contractSources.length ? chalk.yellow : chalk.green)(contractSources.length + ' sources included')),
    );
    logSpinner();
    logSpinner('IPFS Availability Score(# of nodes): ', ipfsAvailabilityScore || 'Run IPFS Locally to get this score');
    logSpinner();
    logSpinner(chalk.yellow(chalk.bold('Smart Contracts')));
    logSpinner(`Note: Any ${chalk.bold('contract name')} that is bolded is highlighted and marked as important.`);
    logSpinner('Contract Addresses:');
    logSpinner('-------------------');
    for (const contractName in contractsAndDetails) {
      const { address, highlight } = contractsAndDetails[contractName];
      const displayName = highlight ? chalk.bold(contractName) : contractName;
      logSpinner(`${displayName}: ${address}`);
    }
    logSpinner('-------------------');
    logSpinner();
    if (sources) {
      logSpinner('Contract Info:');
      logSpinner('-------------------');
      for (const contractName in contractsAndDetails) {
        const { sourceName, highlight } = contractsAndDetails[contractName];
        if (sourceName) {
          const displayName = highlight ? chalk.bold(contractName) : contractName;
          logSpinner(`${displayName}: ${sourceName}`);
        }
      }
      logSpinner('-------------------');
    }
    logSpinner();
    logSpinner(chalk.cyan(chalk.bold('Cannonfile Topology')));
    logSpinner(chalk.cyan(chainDefinition.printTopology().join('\n')));
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
  return Object.keys(pickBy(miscData.artifacts, (v) => v.source));
}

function _outputJson(obj: object) {
  const toOutput = JSON.stringify(obj, null, 2);

  const chunkSize = 16;
  for (let i = 0; i < toOutput.length; i += chunkSize) {
    process.stdout.write(toOutput.slice(i, i + chunkSize));
  }
}
