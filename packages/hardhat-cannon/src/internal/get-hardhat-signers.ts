import viem from 'viem';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export async function getHardhatSigners(hre: HardhatRuntimeEnvironment, provider: ethers.providers.Provider) {
  const accounts = hre.network.config.accounts;
  let signers: ethers.Signer[];

  if (Array.isArray(accounts)) {
    signers = accounts.map((account) => new hre.ethers.Wallet(typeof account === 'string' ? account : account.privateKey));
  } else if (accounts === 'remote') {
    signers = await hre.ethers.getSigners();
  } else {
    signers = Array(accounts.count)
      .fill(0)
      .map((_, i) => hre.ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${i + accounts.initialIndex}`));
  }

  return signers.map((signer) => signer.connect(provider));
}
