import path from 'path';
import { task } from 'hardhat/config';

import CannonRegistry from '../builder/registry';
import IPFS from '../ipfs';
import loadCannonfile from '../internal/load-cannonfile';
import { TASK_PUBLISH } from '../task-names';
import { exportChain } from '../builder/storage';

task(TASK_PUBLISH, 'Provision and publish to the registry the current Cannonfile.toml')
  .addOptionalParam('file', 'TOML definition of the chain to assemble', 'cannonfile.toml')
  .addOptionalParam('tags', 'Comma separated list of labels for your package to be uploaded with.', 'latest')
  .setAction(async ({ file, tags }, hre) => {
    const filepath = path.resolve(hre.config.paths.root, file);
    const def = loadCannonfile(hre, filepath);
    const { name, version } = def;

    const ipfs = new IPFS(hre.config.cannon.ipfsConnection);
    const registry = new CannonRegistry({
      endpoint: hre.config.cannon.registryEndpoint,
      address: hre.config.cannon.registryAddress,
      privateKey: hre.config.cannon.publisherPrivateKey,
    });

    const exported = await exportChain(hre, name, version);

    console.log(`Uploading chain to IPFS (${exported.length})...`);

    const result = await ipfs.client.add({
      content: exported,
    });

    const folderHash = result.cid.toV0().toString();

    const url = `ipfs://${folderHash}`;

    console.log(`Publishing ${name}@${version} with url "${url}"`);

    await registry.publish(name, version, tags.split(','), url);

    console.log('Complete!');
  });
