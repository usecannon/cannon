import path from 'path';
import { task } from 'hardhat/config';
import { TASK_INSPECT } from '../task-names';
import loadCannonfile from '../internal/load-cannonfile';
import installAnvil from '../internal/install-anvil';
import { getChartDir, getAllDeploymentInfos, DeploymentInfo } from '@usecannon/builder';
import { NetworksConfig } from 'hardhat/types';
import chalk from 'chalk';
const { red, bold, gray, green, cyan, magenta } = chalk;

task(TASK_INSPECT, 'Inspect the deployments in a cannon package')
  .addFlag('json', 'Output as JSON')
  .addOptionalParam('file', 'TOML definition of the chain to inspect', 'cannonfile.toml')
  .setAction(async ({ file, json }, hre) => {
    await installAnvil();

    const filepath = path.resolve(hre.config.paths.root, file);
    const def = loadCannonfile(hre, filepath);
    const { name, version } = def;
    const chartsDir = getChartDir(hre.config.paths.cannon, name, version);
    const deployInfo = await getAllDeploymentInfos(chartsDir);

    if (json) {
      console.log(JSON.stringify(deployInfo, null, 2));
    } else {
      if (deployInfo?.deploys) {
        console.log(green(bold(`\n=============== ${name}:${version} ===============`)));
        for (const [chainId, chainData] of Object.entries(deployInfo.deploys)) {
          const chainName = getChainName(chainId, hre.config.networks);
          renderDeployment(chainName, chainId, chainData);
        }
      } else {
        console.log('This cannonfile has not been built for any chains yet.');
      }
    }
    return deployInfo;
  });

function getChainName(chainId: string, networks: NetworksConfig) {
  for (const [chainName, chainInfo] of Object.entries(networks)) {
    if (chainInfo.chainId == parseInt(chainId)) {
      return chainName;
    }
  }
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
