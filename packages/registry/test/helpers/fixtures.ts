import hre from 'hardhat';

export async function fixtureSigner() {
  const wallet = hre.ethers.Wallet.createRandom();

  await hre.network.provider.send('hardhat_setBalance', [
    wallet.address,
    '0x56BC75E2D63100000', // 100 ETH in hex
  ]);

  return new hre.ethers.Wallet(wallet.privateKey, hre.ethers.provider);
}
