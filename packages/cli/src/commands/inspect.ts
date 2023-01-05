import _ from 'lodash';
import { ChainDefinition, IPFSChainBuilderRuntime } from '@usecannon/builder';
import { bold, cyan, green } from 'chalk';
import { parsePackageRef } from '../util/params';
import { createDefaultReadRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { getProvider, runRpc } from '../rpc';

export async function inspect(packageRef: string, json: boolean) {
  const { name, version } = parsePackageRef(packageRef);

  if (version === 'latest') {
    // TODO fetch the current latest version from the registry?
    throw new Error(`You must specify a valid package version, given: "${version}"`);
  }


  const resolver = createDefaultReadRegistry(resolveCliSettings());

  // create temporary provider 
  // todo: really shouldn't be necessary
  const provider = getProvider(
   await runRpc({
    port: 30000 + Math.floor(Math.random() * 30000)
  }));

  const runtime = new IPFSChainBuilderRuntime({
    provider,
    chainId: (await provider.getNetwork()).chainId,
    async getSigner(addr: string) {
      // on test network any user can be conjured
      await provider.send('hardhat_impersonateAccount', [addr]);
      await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
      return provider.getSigner(addr);
    },

    baseDir: null,
    snapshots: false,
  }, resolveCliSettings().ipfsUrl, resolver);

  const deployData = await runtime.readDeploy(packageRef, 'main');

  if (!deployData) {
    throw new Error(`deployment not found: ${packageRef}. please make sure it exists for the given preset and current network.`)
  }

  const chainDefinition = new ChainDefinition(deployData.def);

  if (json) {
    console.log(JSON.stringify(deployData, null, 2));
  } else {
    console.log(green(bold(`\n=============== ${name}:${version} ===============`)));
    console.log(cyan(bold('\nCannonfile Topology')));
    console.log(cyan(chainDefinition.printTopology().join('\n')));
  }

  return deployData;
}