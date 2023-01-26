import _ from 'lodash';
import { task } from 'hardhat/config';
import prompts from 'prompts';
import { TASK_VERIFY } from '../task-names';
import { ChainDefinition, getOutputs, ChainBuilderRuntime, IPFSLoader } from '@usecannon/builder';
import {
  createDefaultReadRegistry,
  loadCannonfile,
  PackageSpecification,
  parsePackageArguments,
  resolveCliSettings,
  runRpc,
} from '@usecannon/cli';
import { getProvider } from '@usecannon/cli/dist/src/rpc';
import path from 'path';

task(TASK_VERIFY, 'Verify a package on Etherscan')
  .addOptionalPositionalParam('packageName', 'Name and version of the Cannon package to verify')
  .addPositionalParam('preset', 'Specify an alternate preset', 'main')
  .addOptionalParam('apiKey', 'Etherscan API key')
  .setAction(async ({ packageName, preset, apiKey }, hre) => {
    let cannonPackage: PackageSpecification;

    if (packageName) {
      cannonPackage = parsePackageArguments(packageName);
    } else {
      // derive from the default cannonfile
      const { name, version } = await loadCannonfile(path.join(hre.config.paths.root, 'cannonfile.toml'));
      cannonPackage = {
        name,
        version,
        settings: {},
      };
    }

    // create temporary provider
    // todo: really shouldn't be necessary
    const provider = getProvider(
      await runRpc({
        port: 30000 + Math.floor(Math.random() * 30000),
      })
    );

    const resolver = createDefaultReadRegistry(resolveCliSettings());

    const runtime = new ChainBuilderRuntime(
      {
        provider,
        chainId: hre.network.config.chainId!,
        async getSigner(addr: string) {
          // on test network any user can be conjured
          await provider.send('hardhat_impersonateAccount', [addr]);
          await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
          return provider.getSigner(addr);
        },

        baseDir: null,
        snapshots: false,
        allowPartialDeploy: false,
      },
      new IPFSLoader(resolveCliSettings().ipfsUrl, resolver)
    );

    const deployData = await runtime.loader.readDeploy(
      `${cannonPackage.name}:${cannonPackage.version}`,
      preset,
      runtime.chainId
    );

    if (!deployData) {
      throw new Error(
        `deployment not found: ${packageName}. please make sure it exists for the given preset and current network.`
      );
    }

    const outputs = await getOutputs(runtime, new ChainDefinition(deployData.def), deployData.state);

    if (!outputs) {
      throw new Error('No chain outputs found. Has the requested chain already been built?');
    }

    if (apiKey) {
      // @ts-ignore
      hre.config.etherscan.apiKey = apiKey;
    }
    // @ts-ignore
    if (!hre.config?.etherscan?.apiKey) {
      const response = await prompts({
        type: 'text',
        name: 'etherscan_apikey',
        message: 'Please enter an Etherscan API key',
      });
      // @ts-ignore
      hre.config.etherscan.apiKey = response.etherscan_apikey;
    }

    for (const c in outputs.contracts) {
      const contract = outputs.contracts[c];

      if (!contract.sourceName || !contract.contractName) {
        console.log(`Skipping ${c}: sourceName or contractName has not been set.`);
        continue;
      }

      console.log('Verifying contract:', c);

      try {
        await hre.run('verify:verify', {
          contract: `${contract.sourceName}:${contract.contractName}`,
          address: contract.address,
          constructorArguments: contract.constructorArgs || [],
        });
      } catch (err) {
        console.log(`Unable to verify ${contract.sourceName}:${contract.contractName} - ${(err as Error).message}`);
      }
    }
  });
