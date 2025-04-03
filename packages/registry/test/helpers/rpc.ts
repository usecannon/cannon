import { ethers } from 'hardhat';

export async function getTimestamp() {
  const { timestamp } = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
  return timestamp;
}
