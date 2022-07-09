import path from 'path';
import { task } from 'hardhat/config';

import { CannonRegistry } from '@usecannon/builder';
import loadCannonfile from '../internal/load-cannonfile';
import { TASK_PUBLISH } from '../task-names';
import { JsonRpcProvider } from '@ethersproject/providers';

task(
  TASK_PUBLISH,
  'Provision and publish to the registry the current Cannonfile.toml'
)
  .addOptionalParam(
    'file',
    'TOML definition of the chain to assemble',
    'cannonfile.toml'
  )
  .addOptionalParam(
    'tags',
    'Comma separated list of labels for your package to be uploaded with.',
    'latest'
  )
  .setAction(async ({ file, tags }, hre) => {
    const filepath = path.resolve(hre.config.paths.root, file);
    const def = loadCannonfile(hre, filepath);
    const { name, version } = def;

    const signers = await hre.ethers.getSigners();

    if (!signers || !signers.length) {
      throw new Error('no signer configured for upload of artifacts');
    }

    console.log(
      `Using wallet address ${signers[0].address} to register the package. To change this, check your hardhat configuration.`
    );

    const registry = new CannonRegistry({
      ipfsOptions: hre.config.cannon.ipfsConnection,
      signerOrProvider: signers[0],
      address: hre.config.cannon.registryAddress,
    });

    const splitTags = tags.split(',');

    console.log(`Uploading and registering package ${name}:${version}...`);

    const txn = await registry.uploadPackage(
      `${name}:${version}`,
      tags ? splitTags : undefined,
      hre.config.paths.cannon
    );

    console.log('txn:', txn.transactionHash, txn.status);

    console.log('Complete!');
  });
