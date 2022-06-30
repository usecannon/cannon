import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import hre from 'hardhat';
import {ContractTransaction} from 'ethers';
import { CannonRegistry as TCannonRegistry } from '../typechain-types/contracts/CannonRegistry';

interface DeploymentArtifact {
  abi: any[];
  address: string;
  constructorArgs?: unknown[];
  deployTxnHash: string;
}

type Artifacts = { [contractName: string]: DeploymentArtifact };

export async function deployOrUpgradeProxy(implementationAddress: string) {
  const contracts: Artifacts = {};

  const proxyDeploymentPath = path.resolve(__dirname, '..', 'deployments', hre.network.name, 'proxy.json');

  if (existsSync(proxyDeploymentPath)) {
    const proxy = JSON.parse((await readFile(proxyDeploymentPath)).toString()) as DeploymentArtifact;
    const CannonRegistry = await hre.ethers.getContractAt('CannonRegistry', proxy.address) as TCannonRegistry;

    const currentImplementaion = await CannonRegistry.getImplementation();

    if (currentImplementaion !== implementationAddress) {
      console.log(`Upgrading proxy implementation from ${currentImplementaion} to ${implementationAddress}`);
      const tx = await CannonRegistry.upgradeTo(implementationAddress);
      await tx.wait();
    }

    contracts.proxy = proxy;
  } else {
    const ProxyFactory = await hre.ethers.getContractFactory('Proxy');
    const Proxy = await ProxyFactory.deploy(implementationAddress);
    await Proxy.deployed();

    const artifact = await hre.artifacts.readArtifact('CannonRegistry')

    contracts.proxy = {
      address: Proxy.address,
      abi: artifact.abi,
      constructorArgs: [implementationAddress],
      deployTxnHash: Proxy.deployTransaction.hash
    };
  }

  return { contracts };
}
