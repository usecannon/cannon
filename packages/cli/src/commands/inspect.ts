import { ChainDefinition, IPFSLoader } from '@usecannon/builder';
import { bold, cyan, green, magentaBright } from 'chalk';
import { parsePackageRef } from '../util/params';
import { createDefaultReadRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { getProvider, runRpc } from '../rpc';
import prompts from 'prompts';
import fs from 'fs-extra';
import { resolve } from 'path';

export async function inspect(packageRef: string, json: boolean) {
  if (!packageRef) {
    await packages();
    return;
  }

  const { name, version } = parsePackageRef(packageRef);

  // TODO I don't think it's adding 'latest' as expected
  if (version === 'latest') {
    // TODO fetch the current latest version from the registry?
    throw new Error(`You must specify a valid package version, given: "${version}"`);
  }

  const resolver = createDefaultReadRegistry(resolveCliSettings());

  // create temporary provider
  // todo: really shouldn't be necessary
  const node = await runRpc({
    port: 30000 + Math.floor(Math.random() * 30000),
  });
  const provider = getProvider(node);

  const loader = new IPFSLoader(resolveCliSettings().ipfsUrl, resolver);

  const deployData = await loader.readDeploy(packageRef, 'main', (await provider.getNetwork()).chainId);

  if (!deployData) {
    throw new Error(
      `deployment not found: ${packageRef}. please make sure it exists for the given preset and current network.`
    );
  }

  const chainDefinition = new ChainDefinition(deployData.def);

  if (json) {
    console.log(JSON.stringify(deployData, null, 2));
  } else {
    console.log(green(bold(`\n=============== ${name}:${version} ===============`)));
    console.log(cyan(bold('\nCannonfile Topology')));
    console.log(cyan(chainDefinition.printTopology().join('\n')));
  }

  node.kill();

  return deployData;
}

async function packages() {
  const { cannonDirectory } = resolveCliSettings();

  const packages = ['coming-soon']; //TODO: temp

  const packageChoices = packages.sort().map((s) => {
    return { title: s };
  });

  console.log(bold(magentaBright(`The following packages are in ${cannonDirectory}`)));
  const { pickedPackageName } = await prompts.prompt([
    {
      type: 'autocomplete',
      name: 'pickedPackageName',
      message: 'Select a package to view available versions:',
      choices: packageChoices,
      suggest: suggestBySubtring,
    },
  ]);
  /*
  const versions = await fs.readdir(resolve(cannonDirectory, pickedPackageName));
  const versionChoices = versions.sort().map((s) => {
    return { title: s };
  });
  const { pickedVersionName } = await prompts.prompt([
    {
      type: 'autocomplete',
      name: 'pickedVersionName',
      message: 'Select a package version to inspect:',
      choices: versionChoices,
      suggest: suggestBySubtring,
    },
  ]);

  await inspect(`${pickedPackageName}:${pickedVersionName}`, false);
  */
  const pickedVersionName = '1.0.0';
  await inspect(`${pickedPackageName}:${pickedVersionName}`, false);
}

// filters choices by subtrings that don't have to be continuous e.g. 'ybtc' will match 'SynthsBTC'
const suggestBySubtring = (input: string, choices: [{ title: string }]) =>
  Promise.resolve(
    choices.filter((choice) => {
      const titleStr = choice.title.toLowerCase();
      let index = 0;
      for (const c of input.toLowerCase()) {
        index = titleStr.indexOf(c, index);
        if (index === -1) {
          return false; // not found
        } else {
          index += 1; // start from next index
        }
      }
      return true;
    })
  );
