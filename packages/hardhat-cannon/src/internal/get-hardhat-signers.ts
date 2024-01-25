import { HardhatRuntimeEnvironment } from 'hardhat/types';

import * as viem from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';

export function getHardhatSigners(hre: HardhatRuntimeEnvironment, provider: viem.WalletClient): viem.Account[] {
  const accounts = hre.network.config.accounts;
  let signers: viem.Account[] = [];

  if (Array.isArray(accounts)) {
    signers = accounts.map((k) => privateKeyToAccount(k as viem.Hash));
  } else if (accounts === 'remote') {
    // TODO
    //signers = hre.
  } else {
    signers = Array(accounts.count)
      .fill(0)
      .map((_, i) => mnemonicToAccount(accounts.mnemonic, { path: accounts.path + `/${i + accounts.initialIndex}` as any }));
  }

  return signers;
}
