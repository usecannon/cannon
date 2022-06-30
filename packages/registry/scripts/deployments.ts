import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import hre from 'hardhat';

interface DeploymentArtifact {
  abi: any[];
  address: string;
  deployTxnHash: string;
}

type Artifacts = { [contractName: string]: DeploymentArtifact };

export async function deployOrUpgradeProxy(implementationAddress: string) {
  console.log('->', implementationAddress);
  console.log('=>', hre.network.config.chainId);

  const contracts: Artifacts = {};
  const txns;

  const proxyDeploymentPath = path.resolve(__dirname, '..', 'deployments', hre.network.name, 'proxy.json');

  if (existsSync(proxyDeploymentPath)) {
    const proxy = JSON.parse((await readFile(proxyDeploymentPath)).toString()) as DeploymentArtifact;
    contracts.proxy = proxy;

    const Proxy = await hre.ethers.getContractAt('CannonRegistry', proxy.address);
  } else {

  }

  return { contracts, txns };
}
