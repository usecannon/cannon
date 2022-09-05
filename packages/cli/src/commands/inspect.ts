import _ from 'lodash';
import os from 'os';
import { resolve } from 'path';
import { ChainDefinition, DeploymentInfo, getAllDeploymentInfos } from '@usecannon/builder';
import { bold, cyan, gray, green, magenta, red } from 'chalk';
import { parsePackageRef } from '../util/params';
import { getChainName } from '../helpers';

export async function inspect(cannonDirectory: string, packageRef: string, json: boolean) {
  const { name, version } = parsePackageRef(packageRef);

  if (version === 'latest') {
    // TODO fetch the current latest version from the registry?
    throw new Error(`You must specify a valid package version, given: "${version}"`);
  }

  const deployInfo = await getAllDeploymentInfos(cannonDirectory);
  const chainDefinition = new ChainDefinition(deployInfo.def);

  if (json) {
    console.log(JSON.stringify(deployInfo, null, 2));
  } else {
    console.log(green(bold(`\n=============== ${name}:${version} ===============`)));
    console.log(cyan(chainDefinition.printTopology().join('\n')));
    if (!_.isEmpty(deployInfo?.deploys)) {
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
  console.log('\nPresets');
  for (const [presetName, presetData] of Object.entries(chainData)) {
    renderPreset(presetName, presetData);
  }
  console.log(gray('\n--------------------------------------------------------'));
}

function renderPreset(presetName: string, presetData: DeploymentInfo) {
  console.log(`${bold(cyan(presetName))}${presetName == 'main' ? gray(' [DEFAULT]') : ''}`);
  if (presetData.ipfsHash.length) {
    console.log('> ✅ Published to IPFS: ' + presetData.ipfsHash);
  } else {
    console.log('> ' + bold(red('⚠️  Not published to IPFS')));
  }
  if (Object.keys(presetData.options).length !== 0) {
    console.log(gray('> Options'));
    console.log(JSON.stringify(presetData.options, null, 2));
  }
}
