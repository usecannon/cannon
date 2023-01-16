import { ChainDefinition, IPFSLoader } from '@usecannon/builder';
import { bold, cyan, green } from 'chalk';
import { parsePackageRef } from '../util/params';
import { createDefaultReadRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import fs from 'fs-extra';
import path from 'path';

export async function inspect(packageRef: string, chainId: number, preset: string, json: boolean, writeDeployments: string) {
  const { name, version } = parsePackageRef(packageRef);

  // TODO I don't think it's adding 'latest' as expected
  if (version === 'latest') {
    // TODO fetch the current latest version from the registry?
    throw new Error(`You must specify a valid package version, given: "${version}"`);
  }

  const resolver = createDefaultReadRegistry(resolveCliSettings());

  const loader = new IPFSLoader(resolveCliSettings().ipfsUrl, resolver);

  const deployData = await loader.readDeploy(packageRef, preset, chainId);

  if (!deployData) {
    throw new Error(
      `deployment not found: ${packageRef}. please make sure it exists for the given preset and current network.`
    );
  }

  const chainDefinition = new ChainDefinition(deployData.def);

  if (writeDeployments) {
    const deploymentData = Object.values(deployData.state)
      .map((a) => a.artifacts)
      .map((a) => a.contracts);

    for (const contract of deploymentData) {
      if (contract && Object.entries(contract).length) {
        const [contractName, contractData] = Object.entries(contract)[0];
        const file = path.join(writeDeployments, `${contractName}.json`);
        await fs.outputFile(file, JSON.stringify(contractData, null, 2));
      }
    }
  }

  if (json) {
    console.log(JSON.stringify(deployData, null, 2));
  } else {
    console.log(green(bold(`\n=============== ${name}:${version} ===============`)));
    console.log(cyan(bold('\nCannonfile Topology')));
    console.log(cyan(chainDefinition.printTopology().join('\n')));
  }

  return deployData;
}
