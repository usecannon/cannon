import _ from 'lodash';
import { resolve } from 'path';
import { ChainDefinition, DeploymentInfo, getAllDeploymentInfos } from '@usecannon/builder';
import { bold, cyan, gray, green, magenta, red } from 'chalk';
import { parsePackageRef } from '../util/params';
import { getChainName } from '../helpers';
import createRegistry from '../registry';
import { build } from './build';
import { CannonRpcNode } from '../rpc';
import { PackageDefinition } from '../types';

export async function inspect(
  cannonDirectory: string,
  packageRef: string,
  json: boolean,
  node: CannonRpcNode,
  writeDeployments: string,
  registryIpfsUrl: string,
  registryRpcUrl: string,
  registryAddress: string,
  registryIpfsAuthorizationHeader?: string
) {
  const { name, version } = parsePackageRef(packageRef);

  console.log(`Downloading ${name}:${version} from the registry...`);

  const registry = createRegistry({
    registryAddress: registryAddress,
    registryRpc: registryRpcUrl,
    ipfsUrl: registryIpfsUrl,
    ipfsAuthorizationHeader: registryIpfsAuthorizationHeader,
  });

  await registry.downloadFullPackage(`${name}:${version}`, cannonDirectory);

  const deployInfo = await getAllDeploymentInfos(`${cannonDirectory}/${name}/${version}`);
  const chainDefinition = new ChainDefinition(deployInfo.def);

  if (writeDeployments) {
    for (const [chainId, chainDeployments] of Object.entries(deployInfo.deploys)) {
      for (const [presetName, presetData] of Object.entries(chainDeployments)) {
        const settings = _.mapValues(presetData.options, function (o) {
          return o.toString();
        });

        const packageDefinition: PackageDefinition = {
          name,
          version,
          settings,
        };

        const deploymentPath = resolve(`${writeDeployments}/${chainId}/${presetName}`);
        await build({
          cannonDirectory,
          packageDefinition,
          node,
          registry,
          preset: presetName,
          persist: false,
          deploymentPath: deploymentPath,
        });
      }
    }
  }

  if (json) {
    console.log(JSON.stringify(deployInfo, null, 2));
  } else {
    console.log(green(bold(`\n=============== ${name}:${version} ===============`)));
    console.log(cyan(bold('\nCannonfile Topology')));
    console.log(cyan(chainDefinition.printTopology().join('\n')));
    if (!_.isEmpty(deployInfo?.deploys)) {
      console.log(cyan(bold('\n\nCannonfile Builds/Deployments')));
      for (const [chainId, chainData] of Object.entries(deployInfo.deploys)) {
        const chainName = getChainName(parseInt(chainId));
        renderDeployment(chainName, chainId, chainData);
      }
    } else {
      console.log('This package has not been built for any chains yet.');
    }
  }

  return deployInfo;
}

function renderDeployment(chainName: string | undefined, chainId: string, chainData: { [preset: string]: DeploymentInfo }) {
  console.log('\n' + magenta(bold(chainName || '')) + ' ' + gray(`(Chain ID: ${chainId})`));
  for (const [presetName, presetData] of Object.entries(chainData)) {
    renderPreset(presetName, presetData);
  }
  console.log('');
}

function renderPreset(presetName: string, presetData: DeploymentInfo) {
  const publishedStatus = presetData.ipfsHash.length
    ? 'Published to the registry (IPFS hash: ' + presetData.ipfsHash + ')'
    : bold(red('Not published to the registry'));
  console.log(`${bold(presetName)}${presetName == 'main' ? gray(' (Default)') : ''}: ${publishedStatus}`);

  if (Object.keys(presetData.options).length !== 0) {
    console.log('\nOptions');
    console.log(gray(JSON.stringify(presetData.options, null, 2)));
    console.log('');
  }
}
