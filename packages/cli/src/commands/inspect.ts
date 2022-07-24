import _ from 'lodash';
import { DeploymentInfo, getAllDeploymentInfos } from '@usecannon/builder';
import { bold, cyan, gray, green, magenta, red } from 'chalk';
import { setupAnvil, findPackage, getChainName } from '../helpers';

export async function inspect(packagesDir: string, packageRef: string, outputJson: boolean) {
  setupAnvil();
  const { name, version } = findPackage(packageRef);
  const def = { printTopology: () => [] }; // TODO: Do we have a util to get a 'def' out of a package instead of a cannonfile?

  const deployInfo = await getAllDeploymentInfos(packagesDir);
  if (outputJson) {
    console.log(JSON.stringify(deployInfo, null, 2));
  } else {
    console.log(green(bold(`\n=============== ${name}:${version} ===============`)));
    console.log(cyan(def.printTopology().join('\n')));
    if (!_.isEmpty(deployInfo?.deploys)) {
      for (const [chainId, chainData] of Object.entries(deployInfo.deploys)) {
        const chainName = getChainName(parseInt(chainId));
        renderDeployment(chainName, chainId, chainData);
      }
    } else {
      console.log('This cannonfile has not been built for any chains yet.');
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
