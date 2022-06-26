import _ from 'lodash';
import path from 'path';
import { task, types } from 'hardhat/config';
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names';

import loadCannonfile from '../internal/load-cannonfile';
import { ChainBuilder } from '@usecannon/builder';
import { SUBTASK_DOWNLOAD, SUBTASK_RPC, SUBTASK_WRITE_DEPLOYMENTS, TASK_BUILD } from '../task-names';
import { HttpNetworkConfig } from 'hardhat/types';
import { ethers } from 'ethers';

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

    const filepath = path.resolve(hre.config.paths.root, file);

    // options can be passed through commandline, or environment
    const mappedOptions: { [key: string]: string } = _.fromPairs((options || []).map((kv: string) => kv.split('=')));
    const def = loadCannonfile(hre, filepath);
    const { name, version } = def;

    let builder: ChainBuilder;
    if (dryRun) {
      // local build with forked network
      if (hre.network.name != 'hardhat') throw new Error('Hardhat selected network must be `hardhat` in order to dryRun.');

      const network = hre.config.networks[dryRun] as HttpNetworkConfig;

      if (!network) throw new Error('Selected dryRun network not found in hardhat configuration');

      if (!network.chainId) throw new Error('Selected network must have chainId set in hardhat configuration');

      const provider = await hre.run(SUBTASK_RPC, { port: port || 8545 });

      builder = new ChainBuilder({
        name,
        version,
        def,

        readMode: 'metadata',
        writeMode: 'none',

        provider,
        async getSigner(addr: string) {
          return hre.ethers.getSigner(addr);
        },

        async getDefaultSigner() {
          return (await hre.ethers.getSigners())[0];
        },

        async getArtifact(name: string) {
          return hre.artifacts.readArtifact(name);
        },
      });
    } else if (hre.network.name === 'hardhat') {
      // clean hardhat network build
      const provider = await hre.run(SUBTASK_RPC, { port: port || 8545 });

      builder = new ChainBuilder({
        name,
        version,
        def,

        readMode: 'all',
        writeMode: 'all',

        provider,
        async getSigner(addr: string) {
          return hre.ethers.getSigner(addr);
        },

        async getArtifact(name: string) {
          return hre.artifacts.readArtifact(name);
        },
      });
    } else {
      builder = new ChainBuilder({
        name,
        version,
        def,

        readMode: 'metadata',
        writeMode: 'metadata',

        provider: hre.ethers.provider as ethers.providers.BaseProvider,
        async getSigner(addr: string) {
          return hre.ethers.getSigner(addr);
        },

        async getDefaultSigner() {
          return (await hre.ethers.getSigners())[0];
        },

        async getArtifact(name: string) {
          return hre.artifacts.readArtifact(name);
        },
      });
    }

    const dependencies = await builder.getDependencies(mappedOptions);

    if (dependencies.length > 0) {
      await hre.run(SUBTASK_DOWNLOAD, { images: dependencies });
    }

    await builder.build(mappedOptions);

    await hre.run(SUBTASK_WRITE_DEPLOYMENTS, {
      outputs: await builder.getOutputs(),
    });

    if (port) {
      // ensure forking configuration is set and ready
      await hre.run('node', { port });
    }

    return {};
  });
