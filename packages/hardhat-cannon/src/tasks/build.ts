import _ from 'lodash';
import path from 'path';
import { task, types } from 'hardhat/config';
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names';

import { build } from '@usecannon/cli';
import loadCannonfile from '../internal/load-cannonfile';
import { CannonRegistry, ChainBuilder, downloadPackagesRecursive, Events } from '@usecannon/builder';
import { SUBTASK_RPC, SUBTASK_WRITE_DEPLOYMENTS, TASK_BUILD } from '../task-names';
import { HttpNetworkConfig, HttpNetworkHDAccountsConfig } from 'hardhat/types';
import { ethers } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { bold, green, greenBright, dim } from 'chalk';
import { table } from 'table';

task(TASK_BUILD, 'Assemble a defined chain and save it to to a state which can be used later')
  .addFlag('noCompile', 'Do not execute hardhat compile before build')
  .addOptionalParam('file', 'TOML definition of the chain to assemble', 'cannonfile.toml')

  .addOptionalParam('preset', 'Specify the preset label the given settings should be applied', 'main')
  .addOptionalVariadicPositionalParam('settings', 'Key values of chain which should be built')
  .setAction(async ({ noCompile, file, settings, preset }, hre) => {
    if (!noCompile) {
      await hre.run(TASK_COMPILE);
      console.log('');
    }

    const filepath = path.resolve(hre.config.paths.root, file);
    build(filepath, preset, settings, hre.artifacts.readArtifact, hre.config.paths.cannon, hre.config.paths.root);
  });
