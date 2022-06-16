import _ from 'lodash';
import path from 'path';
import { subtask, task, types } from 'hardhat/config';
import { TASK_COMPILE, TASK_NODE_SERVER_READY } from 'hardhat/builtin-tasks/task-names';

import loadCannonfile from '../internal/load-cannonfile';
import { ChainBuilder, StorageMode } from '../builder';
import { SUBTASK_DOWNLOAD, SUBTASK_WRITE_DEPLOYMENTS, TASK_BUILD } from '../task-names';
import { HardhatRuntimeEnvironment, HttpNetworkConfig } from 'hardhat/types';

task(TASK_BUILD, 'Assemble a defined chain and save it to to a state which can be used later')
  .addFlag('noCompile', 'Do not execute hardhat compile before build')
  .addOptionalParam('file', 'TOML definition of the chain to assemble', 'cannonfile.toml')
  .addOptionalParam(
    'dryRun',
    'When deploying to a live network, instead deploy and start a local hardhat node. Specify the target network here',
    undefined,
    types.string
  )
  .addOptionalParam(
    'port',
    'If declared, keep running with hardhat network exposed to the specified local port',
    undefined,
    types.int
  )
  .addOptionalVariadicPositionalParam('options', 'Key values of chain which should be built')
  .setAction(async ({ noCompile, file, options, dryRun, port }, hre) => {
    if (!noCompile) {
      await hre.run(TASK_COMPILE);
    }

    const storageMode: StorageMode = !dryRun && hre.network.name === 'hardhat' ? 'full' : dryRun ? 'none' : 'metadata';

    subtask(TASK_NODE_SERVER_READY).setAction(async (_, hre) => {
      await buildCannon(hre, options, file, storageMode);

      console.log('build complete. rpc now available on port', port);
    });

    if (dryRun) {
      if (hre.network.name != 'hardhat') throw new Error('Hardhat selected network must be `hardhat` in order to dryRun.');

      const network = hre.config.networks[dryRun] as HttpNetworkConfig;

      if (!network) throw new Error('Selected dryRun network not found in hardhat configuration');

      if (!network.chainId) throw new Error('Selected network must have chainId set in hardhat configuration');

      hre.config.networks.hardhat.forking = {
        enabled: true,
        url: network.url,
      };

      // TODO: would be better to pass this as an option for the builder rather than messing with hh config here
      hre.config.networks.hardhat.chainId = network.chainId;
    }

    if (port) {
      // ensure forking configuration is set and ready
      await hre.run('node', { port });
    } else {
      await buildCannon(hre, options, file, storageMode);
    }

    return {};
  });

async function buildCannon(hre: HardhatRuntimeEnvironment, options: string[], file: string, storageMode: StorageMode) {
  const filepath = path.resolve(hre.config.paths.root, file);

  console.log('Building cannonfile: ', path.relative(process.cwd(), filepath));

  const def = loadCannonfile(hre, filepath);
  const { name, version } = def;

  // options can be passed through commandline, or environment
  const mappedOptions: { [key: string]: string } = _.fromPairs((options || []).map((kv: string) => kv.split('=')));

  const builder = new ChainBuilder({ name, version, hre, def, storageMode });
  const dependencies = await builder.getDependencies(mappedOptions);

  if (dependencies.length > 0) {
    await hre.run(SUBTASK_DOWNLOAD, { images: dependencies });
  }

  await builder.build(mappedOptions);

  //console.log(builder.getOutputs());

  await hre.run(SUBTASK_WRITE_DEPLOYMENTS, {
    outputs: builder.getOutputs(),
  });
}
