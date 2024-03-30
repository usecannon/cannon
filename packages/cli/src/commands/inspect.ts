import _ from 'lodash';
import { ContractData, ChainArtifacts, ChainDefinition, DeploymentState } from '@usecannon/builder';
import { bold, cyan, green, yellow } from 'chalk';
import { PackageReference } from '@usecannon/builder/dist/package';
import { fetchIPFSAvailability } from '@usecannon/builder/dist/ipfs';
import { createDefaultReadRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import fs from 'fs-extra';
import path from 'path';
import { getMainLoader } from '../loader';
import { getContractsAndDetails, getSourceFromRegistry } from '../helpers';

export async function inspect(
  packageRef: string,
  chainId: number,
  presetArg: string,
  json: boolean,
  writeDeployments: string,
  sources: boolean
) {
  // Handle deprecated preset specification
  if (presetArg) {
    console.warn(
      yellow(
        bold(
          'The --preset option will be deprecated soon. Reference presets in the package reference using the format name:version@preset'
        )
      )
    );
    packageRef = packageRef.split('@')[0] + `@${presetArg}`;
  }

  const { fullPackageRef } = new PackageReference(packageRef);

  const resolver = await createDefaultReadRegistry(resolveCliSettings());

  const loader = getMainLoader(resolveCliSettings());

  const deployUrl = await resolver.getUrl(fullPackageRef, chainId);

  if (!deployUrl) {
    throw new Error(`deployment not found: ${fullPackageRef}. please make sure it exists for chain ID "${chainId}".`);
  }

  if (!chainId) {
    console.warn(
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
    const ipfsUrl = resolveCliSettings().ipfsUrl;
    const ipfsAvailabilityScore = await fetchIPFSAvailability(ipfsUrl, deployUrl.replace('ipfs://', ''));
    const contractsAndDetails = getContractsAndDetails(deployData.state);
    const miscData = await loader.ipfs.read(deployData.miscUrl);
    const contractSources = _listSourceCodeContracts(miscData);

    console.log(green(bold(`\n=============== ${fullPackageRef} ===============`)));
    console.log();
    console.log(
      '   Deploy Status:',
      deployData.status === 'partial' ? yellow(bold(deployData.status)) : green(deployData.status || 'complete')
    );
    console.log(
      '         Options:',
      Object.entries(deployData.options)
        .map((o) => `${o[0]}=${o[1]}`)
        .join(' ') || '(none)'
    );
    packageOwner
      ? console.log('           Owner:', packageOwner)
      : console.log('          Source:', localSource || '(none)');
    console.log('     Package URL:', deployUrl);
    console.log('        Misc URL:', deployData.miscUrl);
    console.log('Package Info URL:', metaUrl || '(none)');
    console.log('Cannon Generator:', deployData.generator);
    console.log('       Timestamp:', new Date(deployData.timestamp * 1000).toLocaleString());
    console.log(
      'Contract Sources:',
      bold((contractSources.length ? yellow : green)(contractSources.length + ' sources included'))
    );
    console.log();
    console.log('IPFS Availability Score(# of nodes): ', ipfsAvailabilityScore || 'Run IPFS Locally to get this score');
    console.log();
    console.log(yellow(bold('Smart Contracts')));
    console.log(`Note: Any ${bold('contract name')} that is bolded is highlighted and marked as important.`);
    console.log('Contract Addresses:');
    console.log('-------------------');
    for (const contractName in contractsAndDetails) {
      const { address, highlight } = contractsAndDetails[contractName];
      const displayName = highlight ? bold(contractName) : contractName;
      console.log(`${displayName}: ${address}`);
    }
    console.log('-------------------');
    console.log();
    if (sources) {
      console.log('Contract Info:');
      console.log('-------------------');
      for (const contractName in contractsAndDetails) {
        const { sourceName, highlight } = contractsAndDetails[contractName];
        if (sourceName) {
          const displayName = highlight ? bold(contractName) : contractName;
          console.log(`${displayName}: ${sourceName}`);
        }
      }
      console.log('-------------------');
    }
    console.log();
    console.log(cyan(bold('Cannonfile Topology')));
    console.log(cyan(chainDefinition.printTopology().join('\n')));
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
