import path from 'path';
import { Contract } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { readFileSync } from 'fs';

export default class CannonRegistry {
  hre: HardhatRuntimeEnvironment;
  contract?: Contract;
  abi: any[];

  inited = false;

  constructor(hre: HardhatRuntimeEnvironment) {
    this.hre = hre;
    this.abi = JSON.parse(
      readFileSync(
        path.resolve(__dirname, '..', 'abis', 'CannonRegistry.json')
      ).toString()
    );
  }

  async init() {
    if (this.inited) return;
    this.inited = true;

    this.contract = await this.hre.ethers.getContractAt(
      this.abi,
      this.hre.config.cannon.registryAddress
    );
  }

  async publish(name: string, version: string, url: string) {
    if (!this.inited) await this.init();

    //@ts-ignore
    const tx = await this.contract.publish(
      this.hre.ethers.utils.formatBytes32String(name),
      this.hre.ethers.utils.formatBytes32String(version),
      url
    );

    return await tx.wait();
  }
}
