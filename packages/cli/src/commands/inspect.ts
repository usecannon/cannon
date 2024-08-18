import _ from 'lodash';
import path from 'path';
import fs from 'fs-extra';
import { bold, cyan, green, yellow } from 'chalk';
import { fetchIPFSAvailability, PackageReference } from '@usecannon/builder';
import { ContractData, ChainArtifacts, ChainDefinition, DeploymentState } from '@usecannon/builder';

import { log, warn } from '../util/console';
import { CliSettings } from '../settings';
import { getMainLoader } from '../loader';
import { createDefaultReadRegistry } from '../registry';
import { getContractsAndDetails, getSourceFromRegistry } from '../helpers';

export async function inspect(
  packageRef: string,
  cliSettings: CliSettings,
  chainId: number,
  presetArg: string,
  json: boolean,
  writeDeployments: string,
  sources: boolean
) {
  // Handle deprecated preset specification
  if (presetArg) {
    warn(
      yellow(
        bold(
          'The --preset option will be deprecated soon. Reference presets in the package reference using the format name:version@preset'
        )
      )
    );
    packageRef = packageRef.split('@')[0] + `@${presetArg}`;
  }

  const { fullPackageRef } = new PackageReference(packageRef);

  const resolver = await createDefaultReadRegistry(cliSettings);

  const loader = getMainLoader(cliSettings);

  const deployUrl = await resolver.getUrl(fullPackageRef, chainId);

  if (!deployUrl) {
    throw new Error(`deployment not found: ${fullPackageRef}. please make sure it exists for chain ID "${chainId}".`);
  }

  if (!chainId) {
    warn(
      yellow(
        "The deployment data for the latest local version of this package (which runs with 'cannon PACKAGE_NAME') was exported. \
      Specify the --chain-id parameter to retrieve the addresses/ABIs for other deployments."
      )
    );
  }

  const deployData = await loader[deployUrl.split(':')[0] as 'ipfs'].read(deployUrl);

  if (!deployData) {
    throw new Error(`deployment data could not be downloaded for ${deployUrl} from ${fullPackageRef}.`);
  }

  const chainDefinition = new ChainDefinition(deployData.def);

  if (writeDeployments) {
    const stateContracts = _getNestedStateContracts(deployData.state, writeDeployments);
    const files = Array.from(stateContracts.entries());

    await Promise.all(
      files.map(([filepath, contractData]) => {
        return fs.outputFile(filepath, JSON.stringify(contractData, null, 2));
      })
    );
  }

  if (json) {
    // use process.stdout.write and write in chunks because bash piping seems to have some sort of
    // a problem with outputting huge amounts of data all at once while using pipes
    const toOutput = JSON.stringify(deployData, null, 2);

    const chunkSize = 16;
    for (let i = 0; i < toOutput.length; i += chunkSize) {
      process.stdout.write(toOutput.slice(i, i + chunkSize));
    }
  } else {
    const metaUrl = await resolver.getMetaUrl(fullPackageRef, chainId);
    const packageOwner = deployData.def.setting?.owner?.defaultValue;
    const localSource = getSourceFromRegistry(resolver.registries);
    const ipfsUrl = cliSettings.ipfsUrl;
    const ipfsAvailabilityScore = await fetchIPFSAvailability(ipfsUrl, deployUrl.replace('ipfs://', ''));
    const contractsAndDetails = getContractsAndDetails(deployData.state);
    const miscData = await loader.ipfs.read(deployData.miscUrl);
    const contractSources = _listSourceCodeContracts(miscData);

    log(green(bold(`\n=============== ${fullPackageRef} ===============`)));
    log();
    log(
      '   Deploy Status:',
      deployData.status === 'partial' ? yellow(bold(deployData.status)) : green(deployData.status || 'complete')
    );
    log(
      '         Options:',
      Object.entries(deployData.options)
        .map((o) => `${o[0]}=${o[1]}`)
        .join(' ') || '(none)'
    );
    packageOwner ? log('           Owner:', packageOwner) : log('          Source:', localSource || '(none)');
    log('     Package URL:', deployUrl);
    log('        Misc URL:', deployData.miscUrl);
    log('Package Info URL:', metaUrl || '(none)');
    log('Cannon Generator:', deployData.generator);
    log('       Timestamp:', new Date(deployData.timestamp * 1000).toLocaleString());
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

  return deployData;
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
