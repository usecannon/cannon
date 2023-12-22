import { ethers } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import type { Signer } from 'ethers';

export async function getHardhatSigners(hre: HardhatRuntimeEnvironment, provider: ethers.providers.Provider) {
  const accounts = hre.network.config.accounts;
  let signers: Signer[];

  if (Array.isArray(accounts)) {
    signers = accounts.map((account) => new ethers.Wallet(typeof account === 'string' ? account : account.privateKey));
  } else if (accounts === 'remote') {
    signers = await (hre as any).ethers.getSigners();
  } else {
    signers = Array(accounts.count)
      .fill(0)
      .map((_, i) => ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${i + accounts.initialIndex}`));
  }

  return signers.map((signer) => signer.connect(provider));
}
