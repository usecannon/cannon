import hre from 'hardhat';
import { Contract } from 'ethers';
import { equal } from 'assert/strict';
import { resolve } from 'path';
import { readFile } from 'fs/promises';
import { TASK_BUILD, TASK_CANNON } from 'hardhat-cannon/src/task-names';
import waitForServer from './helpers/server';
import { JsonRpcServer } from 'hardhat/types';
import { DeploymentArtifact } from 'hardhat-cannon/types';

describe('Hardhat Runtime Environment', function () {
  let server: JsonRpcServer;
  let Token: Contract;

  before('load cannon node', async function () {
    this.timeout(30000);

    await hre.run(TASK_BUILD, { file: 'cannonfile.erc721.toml' });

    hre.run(TASK_CANNON, {
      label: 'erc721:0.0.1',
    });

    server = await waitForServer();
  });

  before('load module', async function () {
    const content = await readFile(
      resolve(hre.config.paths.deployments, hre.network.name, 'ERC721.json')
    );
    const deployment = JSON.parse(content.toString()) as DeploymentArtifact;
    Token = await hre.ethers.getContractAt(deployment.abi, deployment.address);
  });

  after(async function () {
    await server.close();
  });

  it('can interact with default token deployment', async function () {
    equal(await Token.symbol(), 'TKN');
    equal(await Token.name(), 'Token');
  });
});
