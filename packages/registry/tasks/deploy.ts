import fs from 'fs/promises';
import path from 'path';
import { task } from 'hardhat/config';

task('deploy')
  .setAction(async (_, hre) => {
    const Contract = await hre.ethers.getContractFactory('CannonRegistry');
    const contract = await Contract.deploy();

    await contract.deployed();

    console.log('Contract deployed to:', contract.address);

    await fs.writeFile(
      path.resolve(__dirname, '..', 'deployments', `${hre.network.name}.json`),
      JSON.stringify({ CannonRegistry: contract.address }, null, 2)
    );

    await hre.run('verify:verify', {
      address: contract.address,
    });

    console.log(`Contract verified: https://${hre.network.name}.etherscan.io/address/${contract.address}`);
  });
